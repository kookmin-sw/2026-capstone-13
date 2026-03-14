package com.helpboys.api.repository;

import com.helpboys.api.entity.HelpRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface HelpRequestRepository extends JpaRepository<HelpRequest, Long> {
    List<HelpRequest> findAllByOrderByCreatedAtDesc();
    List<HelpRequest> findByRequesterId(Long requesterId);
    List<HelpRequest> findByHelperId(Long helperId);
    List<HelpRequest> findByStatus(HelpRequest.RequestStatus status);
}
