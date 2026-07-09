import pymysql

connection = pymysql.connect(
    host='localhost',
    user='root',
    password='mysql',
    database='devtrack',
    charset='utf8mb4',
    cursorclass=pymysql.cursors.DictCursor
)

try:
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM workflow_steps WHERE workflow_id = 2 ORDER BY sequence")
        for r in cursor.fetchall():
            print(r)
finally:
    connection.close()
