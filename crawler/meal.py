"""
국민대학교 오늘의 식단 크롤러
- https://www.kookmin.ac.kr/user/unLvlh/lvlhSpor/todayMenu/index.do 에서 수집
"""
import requests
from bs4 import BeautifulSoup
from datetime import datetime

MEAL_URL = "https://www.kookmin.ac.kr/user/unLvlh/lvlhSpor/todayMenu/index.do"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
}


def crawl_today_menu() -> list[dict]:
    """
    오늘의 식단 수집
    Returns: [{"cafeteria": ..., "corner": ..., "menu": ..., "date": ...}]
    """
    today = datetime.now().strftime("%Y.%m.%d")

    try:
        resp = requests.get(MEAL_URL, headers=HEADERS, timeout=10)
        resp.raise_for_status()
    except Exception as e:
        print(f"[식단 크롤러] 요청 실패: {e}")
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    results = []

    # 각 식당 섹션 순회
    for section in soup.select("p.cont_subtit"):
        cafeteria_name = section.get_text(strip=True)
        table = section.find_next("table")
        if not table:
            continue

        # 헤더에서 오늘 날짜 열 인덱스 찾기 (0번은 "구분" 열)
        headers = table.select("thead th")
        today_col_idx = None
        for idx, th in enumerate(headers):
            if today in th.get_text():
                today_col_idx = idx
                break

        if today_col_idx is None:
            continue

        # 각 행(코너)에서 오늘 열 데이터 추출
        for row in table.select("tbody tr"):
            cells = row.select("td")
            if len(cells) <= today_col_idx:
                continue

            corner = cells[0].get_text(separator=" ", strip=True)
            menu_cell = cells[today_col_idx]

            # hidden input 제거 후 텍스트 추출
            for hidden in menu_cell.select("input[type=hidden]"):
                hidden.decompose()

            menu_text = "\n".join(
                line.strip()
                for line in menu_cell.get_text(separator="\n", strip=True).splitlines()
                if line.strip()
            )

            if not menu_text:
                continue

            results.append({
                "cafeteria": cafeteria_name,
                "corner": corner,
                "menu": menu_text,
                "date": today,
            })

    print(f"[식단 크롤러] {len(results)}개 항목 수집 ({today})")
    return results