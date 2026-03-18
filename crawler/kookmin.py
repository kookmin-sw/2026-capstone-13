"""
국민대학교 공지사항 크롤러
- 학사공지, 장학공지, 교내채용, 교외채용 수집
"""
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from typing import Optional

BASE_URL = "https://www.kookmin.ac.kr"

NOTICE_CATEGORIES = [
    {"id": "academic",    "name": "학사공지",  "url": f"{BASE_URL}/user/kmuNews/notice/4/index.do"},
    {"id": "scholarship", "name": "장학공지",  "url": f"{BASE_URL}/user/kmuNews/notice/7/index.do"},
    {"id": "job_internal","name": "교내채용",  "url": f"{BASE_URL}/user/kmuNews/notice/10/index.do"},
    {"id": "job_external","name": "교외채용",  "url": f"{BASE_URL}/user/kmuNews/notice/11/index.do"},
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
}


def crawl_category(category: dict, max_pages: int = 2) -> list[dict]:
    """
    카테고리별 공지사항 수집
    Returns: [{"title": ..., "link": ..., "date": ..., "category_id": ..., "category_name": ...}]
    """
    notices = []

    for page in range(1, max_pages + 1):
        url = category["url"]
        params = {"currentPageNo": page}

        try:
            resp = requests.get(url, params=params, headers=HEADERS, timeout=10)
            resp.raise_for_status()
        except Exception as e:
            print(f"[크롤러] {category['name']} 페이지 {page} 요청 실패: {e}")
            break

        soup = BeautifulSoup(resp.text, "html.parser")
        items = soup.select("div.board_list > ul > li")

        if not items:
            break

        for item in items:
            a_tag = item.select_one("a[href]")
            if not a_tag:
                continue

            title_tag = item.select_one("p.title")
            title = title_tag.get_text(strip=True) if title_tag else ""
            if not title:
                continue

            href = a_tag.get("href", "")
            link = BASE_URL + href if href.startswith("/") else href

            # 날짜 파싱
            date_span = item.select_one(".board_etc span:first-child")
            date_str = date_span.get_text(strip=True) if date_span else ""
            pub_date = _parse_date(date_str)

            notices.append({
                "title": title,
                "link": link,
                "date": pub_date,
                "category_id": category["id"],
                "category_name": category["name"],
            })

    return notices


def crawl_all() -> list[dict]:
    """모든 카테고리 공지사항 수집"""
    all_notices = []
    for category in NOTICE_CATEGORIES:
        print(f"[크롤러] {category['name']} 수집 중...")
        notices = crawl_category(category)
        print(f"[크롤러] {category['name']}: {len(notices)}건 수집")
        all_notices.extend(notices)
    return all_notices


def _parse_date(date_str: str) -> Optional[str]:
    """'2026.03.17' 형식 → 'YYYY-MM-DD'"""
    try:
        return datetime.strptime(date_str, "%Y.%m.%d").strftime("%Y-%m-%d")
    except Exception:
        return None
