"""
국민대학교 공지사항 크롤러
- kmuciss (외국인유학생지원센터): 학사, 비자, 장학, 행사/취업, 학생지원, 정부초청
- iat (국제처): 국제교류, 입학
"""
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from typing import Optional

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
}

# kmuciss 게시판 (기존)
KMUCISS_BOARDS = [
    ("https://cms.kookmin.ac.kr/kmuciss/notice/academic.do",    "academic",    "학사"),
    ("https://cms.kookmin.ac.kr/kmuciss/notice/visa.do",        "visa",        "비자"),
    ("https://cms.kookmin.ac.kr/kmuciss/notice/scholarship.do", "scholarship", "장학"),
    ("https://cms.kookmin.ac.kr/kmuciss/notice/event.do",       "event",       "행사/취업"),
    ("https://cms.kookmin.ac.kr/kmuciss/notice/program.do",     "program",     "학생지원"),
    ("https://cms.kookmin.ac.kr/kmuciss/notice/gks.do",         "gks",         "정부초청"),
]

# iat 게시판 (국제처)
IAT_BOARDS = [
    ("https://iat.kookmin.ac.kr/international/community/notice/", "exchange",  "국제교류"),
    ("https://iat.kookmin.ac.kr/admission/community/notice/",     "admission", "입학"),
]

IAT_ADMISSION_PARAM = "sc=434"


def crawl_all(max_pages: int = 2) -> list[dict]:
    """
    전체 게시판 공지사항 수집
    Returns: [{"title": ..., "link": ..., "date": ..., "category_id": ..., "category_name": ...}]
    """
    all_notices = []

    for url, category_id, category_name in KMUCISS_BOARDS:
        notices = _crawl_kmuciss_board(url, category_id, category_name, max_pages)
        all_notices.extend(notices)
        print(f"[크롤러] {category_name}: {len(notices)}건 수집")

    for url, category_id, category_name in IAT_BOARDS:
        notices = _crawl_iat_board(url, category_id, category_name, max_pages)
        all_notices.extend(notices)
        print(f"[크롤러] {category_name}: {len(notices)}건 수집")

    print(f"[크롤러] 전체 공지사항: {len(all_notices)}건 수집")
    return all_notices


def _crawl_kmuciss_board(url: str, category_id: str, category_name: str, max_pages: int) -> list[dict]:
    """kmuciss 게시판 크롤링 (기존 방식)"""
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

            for badge in a_tag.select("span"):
                badge.decompose()
            title = a_tag.get_text(strip=True)
            if not title:
                continue

            href = a_tag.get("href", "").replace("&amp;", "&")
            base = url.split("?")[0]
            link = base + href if href.startswith("?") else href

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


def _crawl_iat_board(url: str, category_id: str, category_name: str, max_pages: int) -> list[dict]:
    """iat 게시판 크롤링 (국제처, pn= 페이지네이션)"""
    notices = []
    base_url = url.rstrip("?&").split("?")[0]
    extra_params = "?sc=434" if category_id == "admission" else ""

    for page in range(max_pages):
        page_url = f"{base_url}{extra_params}{'&' if extra_params else '?'}pn={page}"
        try:
            resp = requests.get(page_url, headers=HEADERS, timeout=10)
            resp.raise_for_status()
        except Exception as e:
            print(f"[크롤러] {category_name} 페이지 {page + 1} 요청 실패: {e}")
            break

        soup = BeautifulSoup(resp.text, "html.parser")
        items = soup.select("li.subject a[href]")

        if not items:
            break

        for a_tag in items:
            title = a_tag.get_text(strip=True)
            if not title:
                continue

            href = a_tag.get("href", "")
            # 상대경로 ./821 → 절대 URL
            if href.startswith("./"):
                link = base_url + href[1:]
                if extra_params:
                    link += ("&" if "?" in link else "?") + "sc=434"
            elif href.startswith("/"):
                link = "https://iat.kookmin.ac.kr" + href
            else:
                link = href

            # 날짜: 같은 li 부모의 li.date
            parent_li = a_tag.find_parent("li")
            parent_ul = parent_li.find_parent("ul") if parent_li else None
            date_str = ""
            if parent_ul:
                date_li = parent_ul.select_one("li.date")
                if date_li:
                    date_str = date_li.get_text(strip=True)
            pub_date = _parse_date_iat(date_str)

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


def _parse_date_iat(date_str: str) -> Optional[str]:
    """'26.03.31' 또는 '2026-03-31' 형식 → 'YYYY-MM-DD'"""
    for fmt in ("%y.%m.%d", "%Y-%m-%d", "%Y.%m.%d"):
        try:
            return datetime.strptime(date_str.strip(), fmt).strftime("%Y-%m-%d")
        except Exception:
            continue
    return None