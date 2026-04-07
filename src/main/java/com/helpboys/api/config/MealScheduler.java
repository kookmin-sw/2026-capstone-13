package com.helpboys.api.config;

import com.helpboys.api.service.MealService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class MealScheduler {

    private final MealService mealService;

    /**
     * 매일 오전 8시 식단 크롤링 (변경된 메뉴만 업데이트)
     * cron: 초 분 시 일 월 요일
     */
    @Scheduled(cron = "0 0 8 * * *", zone = "Asia/Seoul")
    public void scheduledCrawl() {
        log.info("[스케줄러] 일간 식단 크롤링 시작");
        mealService.crawlAndSave();
    }

    /**
     * 매일 오전 8시 30분 번역 누락 식단 재번역 (크롤 후 30분 뒤)
     */
    @Scheduled(cron = "0 30 8 * * *", zone = "Asia/Seoul")
    public void scheduledRetranslateMissing() {
        log.info("[스케줄러] 번역 누락 식단 재번역 시작");
        int count = mealService.retranslateMissing();
        log.info("[스케줄러] 번역 누락 식단 {}건 재번역 완료", count);
    }

    /**
     * 매일 자정 지난 식단 자동 삭제
     */
    @Scheduled(cron = "0 0 0 * * *", zone = "Asia/Seoul")
    public void scheduledCleanup() {
        log.info("[스케줄러] 지난 식단 정리 시작");
        int deleted = mealService.deleteOldMeals();
        log.info("[스케줄러] 지난 식단 {}건 삭제 완료", deleted);
    }
}