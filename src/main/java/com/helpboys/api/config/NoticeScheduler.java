package com.helpboys.api.config;

import com.helpboys.api.service.NoticeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class NoticeScheduler {

    private final NoticeService noticeService;

    /**
     * 매일 오전 8시 국민대 공지 크롤링
     * cron: 초 분 시 일 월 요일
     */
    @Scheduled(cron = "0 0 8 * * *", zone = "Asia/Seoul")
    public void scheduledCrawl() {
        log.info("[스케줄러] 국민대 공지 크롤링 시작");
        noticeService.crawlAndSave();
    }
}
