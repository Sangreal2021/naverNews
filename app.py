"""
1. 가상화 설치
    python -m venv venv
2. 가상화 실행
    .\venv\Scripts\activate
3. app 실행
    python app.py
4. 가상화 종료
    deactivate
5. gitignore 설정
    echo "venv/" >> .gitignore
"""

import os
import time
from flask import Flask, render_template, request, jsonify
from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException
from bs4 import BeautifulSoup
from datetime import datetime
from urllib.parse import quote

app = Flask(__name__)

def parse_pub_date(date_str: str) -> tuple:
    """
    네이버 뉴스 검색 결과의 작성일(date_str)을 파싱하여 (timestamp, display_str) 튜플로 반환.
    """
    date_str = date_str.strip()
    display_str = date_str
    timestamp = 0
    try:
        dt = datetime.strptime(date_str, "%Y.%m.%d. %H:%M")
        display_str = dt.strftime("%Y-%m-%d %H:%M")
        timestamp = dt.timestamp()
    except ValueError:
        pass  # '1시간 전', '어제' 등은 그대로 사용
    return (timestamp, display_str)

def fetch_news(keyword, max_pages=1):
    """
    검색어(keyword)에 대해, sort=1(최신순)으로
    최대 max_pages 페이지까지 크롤링 (페이지당 10개).
    언론사명과 작성일을 함께 파싱해 내림차순 정렬 후 반환.
    """
    encoded_keyword = quote(keyword)
    base_url = "https://search.naver.com/search.naver?where=news&query={}&sort=1"

    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    # GPU 경고 제거 옵션(선택)
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--disable-software-rasterizer")
    chrome_options.add_argument("--blink-settings=imagesEnabled=false")

    driver = webdriver.Chrome(
        service=ChromeService(ChromeDriverManager().install()),
        options=chrome_options
    )

    articles = []
    try:
        for page in range(max_pages):
            start = page * 10 + 1  # 1, 11, 21, ...
            url = f"{base_url.format(encoded_keyword)}&start={start}"

            driver.get(url)
            # time.sleep(2)

            # ==== WebDriverWait 적용 ====
            wait = WebDriverWait(driver, 10)  # 최대 10초 대기
            # 로딩 완료를 "ul.list_news > li.bx" 요소가 나타날 때까지 기다림
            wait.until(EC.presence_of_element_located(
                (By.CSS_SELECTOR, "ul.list_news > li.bx")
            ))
            # ===========================

            page_source = driver.page_source
            soup = BeautifulSoup(page_source, "html.parser")

            news_list = soup.select("ul.list_news > li.bx")
            if not news_list:
                break

            for news in news_list:
                title_tag = news.select_one("a.news_tit")
                if not title_tag:
                    continue

                title = title_tag.text.strip()
                link = title_tag["href"].strip()

                # (옵션) 검색어 필터
                # if keyword.lower() not in title.lower():
                #     continue

                # 작성일 추출
                date_tag = news.select_one("span.info")
                date_text = date_tag.get_text().strip() if date_tag else "발행일 정보 없음"
                pub_ts, pub_str = parse_pub_date(date_text)

                # 언론사명 추출
                media_tag = news.select_one(".info_group a.info.press")
                if media_tag:
                    media_name = media_tag.get_text().strip()
                    # ------------ 치환 로직 추가 ------------
                    if "언론사 선정" in media_name:
                        media_name = media_name.replace("언론사 선정", "").strip()
                else:
                    media_name = "언론사 정보 없음"

                # 설명
                desc_tag = news.select_one("div.news_dsc")
                description = desc_tag.get_text().strip() if desc_tag else "설명 없음"

                articles.append({
                    "title": title,
                    "link": link,
                    "description": description,
                    "pubDate_ts": pub_ts,
                    "pubDate_str": pub_str,
                    "media": media_name
                })

        # 작성일 내림차순 정렬
        articles.sort(key=lambda x: x["pubDate_ts"], reverse=True)
        return articles

    except TimeoutException:
        print("페이지 로딩 TimeoutException.")
        return []
    except Exception as e:
        print(f"오류 발생: {e}")
        return []
    finally:
        driver.quit()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/search", methods=["POST"])
def search():
    data = request.get_json()
    if not data:
        return jsonify({"error": "JSON 형식으로 검색 정보를 전달해주세요"}), 400

    keyword = data.get("keyword", "").strip()
    max_pages = data.get("max_pages", 1)

    if not keyword:
        return jsonify({"error": "검색어를 입력하세요."}), 400

    try:
        max_pages = int(max_pages)
        if max_pages < 1:
            raise ValueError
    except ValueError:
        return jsonify({"error": "크롤링할 페이지 수는 1 이상의 숫자여야 합니다."}), 400

    articles = fetch_news(keyword, max_pages=max_pages)
    if not articles:
        return jsonify({"error": "검색 결과가 없습니다."}), 404

    results = []
    for art in articles:
        results.append({
            "title": art["title"],
            "link": art["link"],
            "description": art["description"],
            "pubDate": art["pubDate_str"],
            "media": art["media"]
        })

    return jsonify({"results": results})

if __name__ == "__main__":
    app.run(debug=True)
