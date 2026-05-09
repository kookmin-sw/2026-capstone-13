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
     */
    @Scheduled(cron = "0 0 8 * * *", zone = "Asia/Seoul")
    public void scheduledCrawl() {
        log.info("[스케줄러] 국민대 공지 크롤링 시작");
        noticeService.crawlAndSave();
    }

    /**
     * 매일 자정 30일 지난 공지 자동 삭제
     */
    @Scheduled(cron = "0 0 0 * * *", zone = "Asia/Seoul")
    public void scheduledCleanup() {
        int deleted = noticeService.deleteOldNotices(30);
        log.info("[스케줄러] 오래된 공지 {}건 삭제", deleted);
    }
}
