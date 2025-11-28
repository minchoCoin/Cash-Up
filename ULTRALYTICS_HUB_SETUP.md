# Ultralytics HUB API 설정 가이드

Cash-Up 프로젝트는 Ultralytics HUB API를 사용하여 클라우드에서 YOLO 객체 인식을 수행합니다.
이를 통해 EC2 서버의 부담을 줄이고 작은 인스턴스에서도 실행할 수 있습니다.

## 목차
1. [Ultralytics HUB 계정 생성](#1-ultralytics-hub-계정-생성)
2. [API 키 발급](#2-api-키-발급)
3. [모델 설정](#3-모델-설정)
4. [환경 변수 설정](#4-환경-변수-설정)
5. [코드 수정 (선택사항)](#5-코드-수정-선택사항)

---

## 1. Ultralytics HUB 계정 생성

1. [Ultralytics HUB](https://hub.ultralytics.com) 접속
2. **Sign Up** 클릭하여 계정 생성
   - GitHub, Google 계정으로 간편 가입 가능
3. 이메일 인증 완료

---

## 2. API 키 발급

1. 로그인 후 대시보드로 이동
2. 우측 상단 프로필 아이콘 클릭 → **Settings**
3. **API Keys** 섹션에서 **Generate API Key** 클릭
4. API 키 복사 (예: `api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
5. 안전한 곳에 보관

---

## 3. 모델 설정

### 옵션 A: 기본 YOLOv8 모델 사용 (권장)

Ultralytics HUB는 사전 학습된 YOLOv8 모델을 제공합니다:

1. 대시보드에서 **Models** 탭 클릭
2. **Pre-trained Models** 섹션에서 `YOLOv8n` 또는 `YOLOv8s` 선택
   - **YOLOv8n**: 가장 빠르고 가벼움 (nano)
   - **YOLOv8s**: 균형잡힌 성능 (small)
3. 모델 ID 또는 API 엔드포인트 확인

### 옵션 B: 커스텀 모델 학습 (고급)

쓰레기 인식에 특화된 모델을 원한다면:

1. **New Project** 생성
2. 쓰레기 이미지 데이터셋 업로드
3. 라벨링 및 학습 진행
4. 학습 완료 후 모델 ID 확인

---

## 4. 환경 변수 설정

### 로컬 개발 환경

`server/.env` 파일에 추가:

```env
# Ultralytics HUB API 설정
ULTRALYTICS_API_KEY=api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 사용할 모델 지정 (선택사항)
# YOLO_MODEL_ID=yolov8n  # 기본값
# 또는 커스텀 모델 ID 사용
# YOLO_MODEL_ID=your-custom-model-id
```

### 프로덕션 환경 (EC2)

EC2 서버의 `server/.env` 파일:

```env
# FastAPI Backend
ADMIN_PASSWORD=your-secure-admin-password
ADMIN_TOKEN=your-secure-admin-token
FESTIVAL_ID=default-festival-id
SECRET_KEY=your-very-long-secret-key-here

# Ultralytics HUB API
ULTRALYTICS_API_KEY=api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
YOLO_MODEL_ID=yolov8n

# Database
# DATABASE_URL=postgresql://user:password@localhost:5432/cashup

# CORS
CORS_ORIGINS=http://your-domain.com,https://your-domain.com
```

### GitHub Secrets 설정

GitHub 저장소 → Settings → Secrets → `ENV_PRODUCTION`에 위 내용 포함

---

## 5. 코드 수정 (선택사항)

현재 코드가 로컬 YOLO 모델을 사용하는 경우, API 방식으로 변경해야 합니다.

### `server/app/yolo_utils.py` 수정 예시

**기존 코드 (로컬 모델):**
```python
from ultralytics import YOLO

model = YOLO('yolov8n.pt')

def analyze_trash(image_path: str):
    results = model(image_path)
    # ... 처리
```

**수정된 코드 (HUB API):**
```python
import os
import requests
from pathlib import Path

ULTRALYTICS_API_KEY = os.getenv("ULTRALYTICS_API_KEY")
YOLO_MODEL_ID = os.getenv("YOLO_MODEL_ID", "yolov8n")

def analyze_trash(image_path: str):
    """Ultralytics HUB API를 사용한 객체 인식"""

    if not ULTRALYTICS_API_KEY:
        print("⚠️  ULTRALYTICS_API_KEY not set, skipping detection")
        return {
            "has_trash": None,
            "trash_count": None,
            "max_trash_confidence": None,
            "raw_detections": None,
        }

    try:
        # HUB API 호출
        url = f"https://api.ultralytics.com/v1/predict/{YOLO_MODEL_ID}"

        headers = {
            "x-api-key": ULTRALYTICS_API_KEY,
        }

        with open(image_path, 'rb') as f:
            files = {'file': f}
            response = requests.post(url, headers=headers, files=files, timeout=30)

        if response.status_code != 200:
            print(f"⚠️  HUB API error: {response.status_code}")
            return {
                "has_trash": None,
                "trash_count": None,
                "max_trash_confidence": None,
                "raw_detections": None,
            }

        data = response.json()

        # 응답 파싱
        detections = data.get('data', {}).get('detections', [])

        # 쓰레기로 간주할 클래스 (COCO 데이터셋 기준)
        trash_classes = ['bottle', 'cup', 'fork', 'knife', 'spoon',
                        'bowl', 'banana', 'apple', 'sandwich', 'orange',
                        'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake']

        trash_detections = [
            d for d in detections
            if d.get('class', '').lower() in trash_classes
        ]

        has_trash = len(trash_detections) > 0
        trash_count = len(trash_detections)
        max_confidence = max([d.get('confidence', 0) for d in trash_detections], default=0)

        return {
            "has_trash": has_trash,
            "trash_count": trash_count,
            "max_trash_confidence": float(max_confidence),
            "raw_detections": trash_detections,
        }

    except Exception as e:
        print(f"❌ Error analyzing image: {e}")
        return {
            "has_trash": None,
            "trash_count": None,
            "max_trash_confidence": None,
            "raw_detections": None,
        }
```

### `server/requirements.txt` 수정

API 방식을 사용하면 ultralytics 패키지를 제거하거나 경량화할 수 있습니다:

```txt
fastapi==0.110.0
uvicorn[standard]==0.27.1
sqlalchemy==2.0.28
python-dotenv==1.0.1
python-multipart==0.0.9
Pillow==10.2.0
imagehash==4.3.1
requests==2.31.0  # HUB API 호출용
pytest==7.3.2

# ultralytics 제거 또는 선택적 설치
# ultralytics==8.3.30
```

---

## 6. API 사용량 및 요금

### Free Tier
- 월 1,000 predictions 무료
- 개발 및 테스트에 적합

### Pro Plan
- 무제한 predictions
- 더 빠른 응답 속도
- 우선 지원

자세한 요금은 [Ultralytics Pricing](https://ultralytics.com/pricing) 참고

---

## 7. 장점 및 고려사항

### 장점
- EC2 인스턴스 비용 절감 (t2.micro로 가능)
- GPU 불필요
- 모델 업데이트 자동 반영
- 확장성 우수

### 고려사항
- API 호출 비용 발생 (Free Tier 초과 시)
- 네트워크 지연 (이미지 업로드 시간)
- API 의존성 (Ultralytics 서버 다운 시 영향)

---

## 8. 테스트

### 로컬 테스트

```bash
cd server
source venv/bin/activate

# 환경 변수 설정 확인
cat .env | grep ULTRALYTICS

# FastAPI 실행
uvicorn app.main:app --reload --port 8000

# 다른 터미널에서 테스트
curl -X POST "http://localhost:8000/api/festivals/FESTIVAL_ID/trash-photos" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@test_image.jpg" \
  -F "userId=USER_ID"
```

### 로그 확인

YOLO 처리 로그에서 HUB API 호출 확인:
```
📸 Analyzing image with Ultralytics HUB API...
✅ Detection complete: 3 objects found
```

---

## 9. 문제 해결

### API 키 오류
```
❌ Error: Invalid API key
```
→ `.env` 파일의 `ULTRALYTICS_API_KEY` 확인

### 타임아웃 오류
```
❌ Error: Request timeout
```
→ `requests.post(..., timeout=60)` 시간 늘리기

### 모델 없음 오류
```
❌ Error: Model not found
```
→ `YOLO_MODEL_ID` 확인 또는 HUB 대시보드에서 모델 상태 확인

---

## 10. 추가 리소스

- [Ultralytics HUB 문서](https://docs.ultralytics.com/hub/)
- [YOLOv8 모델 비교](https://docs.ultralytics.com/models/yolov8/)
- [API 레퍼런스](https://docs.ultralytics.com/hub/api/)

---

## 요약

1. Ultralytics HUB 계정 생성 → API 키 발급
2. `.env`에 `ULTRALYTICS_API_KEY` 추가
3. `yolo_utils.py`를 API 방식으로 수정
4. EC2 인스턴스 타입을 t2.micro/t3.small로 축소 가능
5. GitHub Secrets의 `ENV_PRODUCTION`에 API 키 포함

이제 배포 시 YOLO 모델 파일을 다운로드하거나 관리할 필요가 없습니다!