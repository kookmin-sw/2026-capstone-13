package com.helpboys.api.repository;

import com.helpboys.api.entity.Report;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReportRepository extends JpaRepository<Report, Long> {

    boolean existsByReporterIdAndTargetUserIdAndTargetTypeAndTargetId(
            Long reporterId, Long targetUserId, Report.TargetType targetType, Long targetId);
}