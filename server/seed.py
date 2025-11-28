from sqlalchemy import select

from app.db import create_db_and_tables, get_db
from app.models import Festival, TrashBin


def main():
    create_db_and_tables()
    with get_db() as db:
        existing = (
            db.execute(select(Festival).where(Festival.name == "해운대 불꽃축제"))
            .scalars()
            .first()
        )
        festival = existing
        if not festival:
            festival = Festival(
                name="해운대 불꽃축제",
                budget=5_000_000,
                per_user_daily_cap=3000,
                per_photo_point=100,
                center_lat=35.1587,
                center_lng=129.1604,
                radius_meters=1200,
            )
            db.add(festival)
            db.flush()
            db.refresh(festival)

        existing_bins = (
            db.execute(select(TrashBin).where(TrashBin.festival_id == festival.id))
            .scalars()
            .all()
        )
        if not existing_bins:
            bins = [
                {"code": "TRASH_BIN_01", "name": "중앙무대 옆", "description": "바다 방향 메인 무대 왼편"},
                {"code": "TRASH_BIN_02", "name": "해운대역 출구 인근", "description": "해운대역 3번 출구"},
                {"code": "TRASH_BIN_03", "name": "광안대교 뷰 포토존", "description": "포토존 안내판 옆"},
            ]
            for bin_data in bins:
                db.add(
                    TrashBin(
                        festival_id=festival.id,
                        code=bin_data["code"],
                        name=bin_data["name"],
                        description=bin_data["description"],
                    )
                )

        print("Seed completed. Festival id:", festival.id)


if __name__ == "__main__":
    main()
