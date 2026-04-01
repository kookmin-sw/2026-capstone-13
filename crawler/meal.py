"""
국민대학교 주간 식단 크롤러
- https://www.kookmin.ac.kr/user/unLvlh/lvlhSpor/todayMenu/index.do 에서 수집
"""
import requests
from bs4 import BeautifulSoup

MEAL_URL = "https://www.kookmin.ac.kr/user/unLvlh/lvlhSpor/todayMenu/index.do"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
}


def crawl_weekly_menu() -> list[dict]:
    """
    주간 식단 전체 수집 (페이지에 표시된 7일치)
    Returns: [{"cafeteria": ..., "corner": ..., "menu": ..., "date": "YYYY.MM.DD"}]
    """
    try:
        resp = requests.get(MEAL_URL, headers=HEADERS, timeout=10)
        resp.raise_for_status()
    except Exception as e:
        print(f"[식단 크롤러] 요청 실패: {e}")
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    results = []

    for section in soup.select("p.cont_subtit"):
        cafeteria_name = section.get_text(strip=True)
        table = section.find_next("table")
        if not table:
            continue

        # 헤더에서 날짜 목록 추출 (0번 "구분" 제외)
        headers = table.select("thead th")
        dates = []
        for th in headers[1:]:
            text = th.get_text(strip=True)
            # "2026.04.07(월)" → "2026.04.07"
            date_part = text[:10] if len(text) >= 10 else text
            dates.append(date_part)

        # 각 행(코너) 순회
        for row in table.select("tbody tr"):
            cells = row.select("td")
            if len(cells) < 2:
                continue

            corner = cells[0].get_text(separator=" ", strip=True)

            # 날짜별 열 순회 (1번 인덱스부터)
            for col_idx, date_str in enumerate(dates, start=1):
                if col_idx >= len(cells):
                    break

                menu_cell = cells[col_idx]

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
                    "date": date_str,
                })

    print(f"[식단 크롤러] {len(results)}개 항목 수집")
    return results