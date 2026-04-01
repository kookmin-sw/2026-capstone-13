"""
국민대학교 공지사항 크롤러
- https://cms.kookmin.ac.kr/apply/boardtype/api-bulletin-board.do 단일 URL에서 수집
"""
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from typing import Optional

NOTICE_URL = "https://cms.kookmin.ac.kr/apply/boardtype/api-bulletin-board.do"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
}


def crawl_all(max_pages: int = 2) -> list[dict]:
    """
    공지사항 수집
    Returns: [{"title": ..., "link": ..., "date": ..., "category_id": ..., "category_name": ...}]
    """
    notices = []

    for page in range(max_pages):
        # 첫 페이지는 파라미터 없이, 이후 페이지는 article.offset 사용
        params = {} if page == 0 else {
            "mode": "list",
            "pager.offset": 0,
            "pagerLimit": 10,
            "article.offset": page * 10,
        }

        try:
            resp = requests.get(NOTICE_URL, params=params, headers=HEADERS, timeout=10)
            resp.raise_for_status()
        except Exception as e:
            print(f"[크롤러] 페이지 {page + 1} 요청 실패: {e}")
            break

        soup = BeautifulSoup(resp.text, "html.parser")
        items = soup.select("td.b-td-left")

        if not items:
            break

        for item in items:
            a_tag = item.select_one("a[href]")
            if not a_tag:
                continue

            # [공지] 뱃지 span 제거 후 제목 추출
            for badge in a_tag.select("span"):
                badge.decompose()
            title = a_tag.get_text(strip=True)
            if not title:
                continue

            # 링크: ?mode=view&pid=xxxxx → 절대 URL로 변환
            href = a_tag.get("href", "").replace("&amp;", "&")
            link = NOTICE_URL.split("?")[0] + href if href.startswith("?") else href

            # 날짜
            date_span = item.select_one(".b-date")
            date_str = date_span.get_text(strip=True) if date_span else ""
            pub_date = _parse_date(date_str)

            notices.append({
                "title": title,
                "link": link,
                "date": pub_date,
                "category_id": "notice",
                "category_name": "공지사항",
            })

    print(f"[크롤러] 공지사항: {len(notices)}건 수집")
    return notices


def _parse_date(date_str: str) -> Optional[str]:
    """'2026-04-01' 형식 → 'YYYY-MM-DD'"""
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").strftime("%Y-%m-%d")
    except Exception:
        return None
