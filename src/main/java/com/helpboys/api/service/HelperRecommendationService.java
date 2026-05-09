package com.helpboys.api.service;

import com.helpboys.api.dto.HelperRecommendResponse;
import com.helpboys.api.dto.UserResponse;
import com.helpboys.api.entity.HelpRequest;
import com.helpboys.api.entity.User;
import com.helpboys.api.exception.BusinessException;
import com.helpboys.api.repository.HelpRequestRepository;
import com.helpboys.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HelperRecommendationService {

    private final HelpRequestRepository helpRequestRepository;
    private final UserRepository userRepository;

    private static final int CANDIDATE_SIZE = 20;
    private static final int RECOMMEND_SIZE = 5;

    private static final Map<HelpRequest.HelpCategory, List<String>> CATEGORY_MAJOR_KEYWORDS = Map.of(
            HelpRequest.HelpCategory.BANK,     List.of("경영", "금융", "경제", "회계", "business", "finance", "economics", "accounting"),
            HelpRequest.HelpCategory.HOSPITAL, List.of("의학", "간호", "보건", "약학", "medicine", "nursing", "health", "pharmacy"),
            HelpRequest.HelpCategory.SCHOOL,   List.of("교육", "행정", "education", "administration", "사범"),
            HelpRequest.HelpCategory.DAILY,    List.of("사회", "생활", "sociology", "social", "복지"),
            HelpRequest.HelpCategory.OTHER,    List.of()
    );

    @Transactional(readOnly = true)
    public List<HelperRecommendResponse> recommend(Long requestId, List<Long> excludeHelperIds) {
        HelpRequest request = helpRequestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException("요청을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));

        List<Long> excludeIds = new ArrayList<>(excludeHelperIds);
        excludeIds.add(request.getRequester().getId());

        // 1단계: 해당 카테고리 완료 경험 있는 헬퍼 조회 (경험 횟수 + 평점 순)
        List<Object[]> categoryRows = helpRequestRepository.findTopHelpersByCategory(
                request.getCategory(),
                HelpRequest.RequestStatus.COMPLETED,
                excludeIds,
                PageRequest.of(0, CANDIDATE_SIZE));

        List<ScoredHelper> scored = new ArrayList<>();
        Set<Long> foundIds = new HashSet<>();

        for (Object[] row : categoryRows) {
            User helper = (User) row[0];
            long categoryCount = (Long) row[1];
            double score = categoryCount * 10.0 + helper.getRating() * 2.0 + majorScore(helper, request.getCategory());
            scored.add(new ScoredHelper(helper, score, buildReason(helper, categoryCount)));
            foundIds.add(helper.getId());
        }

        // 2단계: 5명 미만이면 고평점 헬퍼로 채우기
        if (scored.size() < RECOMMEND_SIZE) {
            List<Long> allExclude = new ArrayList<>(excludeIds);
            allExclude.addAll(foundIds);
            int remaining = CANDIDATE_SIZE - scored.size();
            List<User> fallbacks = userRepository.findTopKoreanHelpersByRating(allExclude, PageRequest.of(0, remaining));
            for (User helper : fallbacks) {
                double score = helper.getRating() * 2.0 + majorScore(helper, request.getCategory());
                scored.add(new ScoredHelper(helper, score, buildReason(helper, 0)));
            }
        }

        return scored.stream()
                .sorted(Comparator.comparingDouble(ScoredHelper::score).reversed())
                .limit(RECOMMEND_SIZE)
                .map(s -> HelperRecommendResponse.builder()
                        .helper(UserResponse.fromPublic(s.helper()))
                        .matchReason(s.reason())
                        .build())
                .collect(Collectors.toList());
    }

    private double majorScore(User helper, HelpRequest.HelpCategory category) {
        if (helper.getMajor() == null || helper.getMajor().isBlank()) return 0;
        String major = helper.getMajor().toLowerCase();
        List<String> keywords = CATEGORY_MAJOR_KEYWORDS.getOrDefault(category, List.of());
        return keywords.stream().anyMatch(major::contains) ? 3.0 : 0.0;
    }

    private String buildReason(User helper, long categoryCount) {
        StringBuilder sb = new StringBuilder();
        if (categoryCount > 0) {
            sb.append("관련 도움 ").append(categoryCount).append("회");
        }
        if (helper.getRating() != null && helper.getRating() > 0) {
            if (!sb.isEmpty()) sb.append(" · ");
            sb.append("평점 ").append(String.format("%.1f", helper.getRating()));
        }
        if (helper.getMajor() != null && !helper.getMajor().isBlank()) {
            if (!sb.isEmpty()) sb.append(" · ");
            sb.append(helper.getMajor());
        }
        return sb.isEmpty() ? "추천 헬퍼" : sb.toString();
    }

    private record ScoredHelper(User helper, double score, String reason) {}
}
