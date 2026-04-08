package com.helpboys.api.repository;

import com.helpboys.api.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    List<User> findByStudentIdStatus(User.StudentIdStatus status);
    List<User> findByUserType(User.UserType userType);

    @Modifying
    @Query("UPDATE User u SET u.helpCount = u.helpCount + 1 WHERE u.id = :id")
    void incrementHelpCount(@Param("id") Long id);

    @Modifying
    @Query("UPDATE User u SET u.rating = (SELECT ROUND(AVG(r.rating) * 10) / 10.0 FROM Review r WHERE r.reviewee.id = :id) WHERE u.id = :id")
    void updateRatingFromReviews(@Param("id") Long id);
}