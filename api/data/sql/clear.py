from common.logger import info_logger
from sqlalchemy import text
from data.sql.base import sqlalchemy_engine

# =========================================================
# PostgreSQL：安全清库
# =========================================================

def drop_schema_postgres():
    info_logger.warning("⚠️ Dropping ALL tables via DROP SCHEMA public CASCADE...")
    with sqlalchemy_engine.connect() as conn:
        conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE;"))
        conn.execute(text("CREATE SCHEMA public;"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO public;"))
        conn.commit()
    info_logger.warning("✅ Schema public recreated.")
    
if __name__ == '__main__':
    drop_schema_postgres()