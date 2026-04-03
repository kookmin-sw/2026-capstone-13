"""
국민대학교 국제처 공지사항 크롤러
- 학사, 비자, 장학, 행사/취업, 학생지원, 정부초청 6개 게시판 수집
"""
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from typing import Optional

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
}

# 크롤링할 게시판 목록 (URL, category_id, category_name)
NOTICE_BOARDS = [
    ("https://cms.kookmin.ac.kr/kmuciss/notice/academic.do",    "academic",    "학사"),
    ("https://cms.kookmin.ac.kr/kmuciss/notice/visa.do",        "visa",        "비자"),
    ("https://cms.kookmin.ac.kr/kmuciss/notice/scholarship.do", "scholarship", "장학"),
    ("https://cms.kookmin.ac.kr/kmuciss/notice/event.do",       "event",       "행사/취업"),
    ("https://cms.kookmin.ac.kr/kmuciss/notice/program.do",     "program",     "학생지원"),
    ("https://cms.kookmin.ac.kr/kmuciss/notice/gks.do",         "gks",         "정부초청"),
]


def crawl_all(max_pages: int = 2) -> list[dict]:
    """
    6개 게시판 공지사항 수집
    Returns: [{"title": ..., "link": ..., "date": ..., "category_id": ..., "category_name": ...}]
    """
    all_notices = []

    for url, category_id, category_name in NOTICE_BOARDS:
        notices = _crawl_board(url, category_id, category_name, max_pages)
        all_notices.extend(notices)
        print(f"[크롤러] {category_name}: {len(notices)}건 수집")

    print(f"[크롤러] 전체 공지사항: {len(all_notices)}건 수집")
    return all_notices


def _crawl_board(url: str, category_id: str, category_name: str, max_pages: int) -> list[dict]:
    """단일 게시판 크롤링"""
    notices = []

    for page in range(max_pages):
        params = {} if page == 0 else {
            "mode": "list",
            "pager.offset": 0,
            "pagerLimit": 10,
            "article.offset": page * 10,
        }

        try:
            resp = requests.get(url, params=params, headers=HEADERS, timeout=10)
            resp.raise_for_status()
        except Exception as e:
            print(f"[크롤러] {category_name} 페이지 {page + 1} 요청 실패: {e}")
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

            # 링크: 상대 경로 → 절대 URL 변환
            href = a_tag.get("href", "").replace("&amp;", "&")
            base = url.split("?")[0]
            link = base + href if href.startswith("?") else href

            # 날짜
            date_span = item.select_one(".b-date")
            date_str = date_span.get_text(strip=True) if date_span else ""
            pub_date = _parse_date(date_str)

            notices.append({
                "title": title,
                "link": link,
                "date": pub_date,
                "category_id": category_id,
                "category_name": category_name,
            })

    return notices


def _parse_date(date_str: str) -> Optional[str]:
    """'2026-04-01' 형식 → 'YYYY-MM-DD'"""
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").strftime("%Y-%m-%d")
    except Exception:
        return None