package com.helpboys.api.repository;

import com.helpboys.api.entity.Meal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface MealRepository extends JpaRepository<Meal, Long> {

    boolean existsByCafeteriaAndCornerAndMealDate(String cafeteria, String corner, LocalDate mealDate);

    Optional<Meal> findByCafeteriaAndCornerAndMealDate(String cafeteria, String corner, LocalDate mealDate);

    @Query("SELECT DISTINCT m FROM Meal m LEFT JOIN FETCH m.translations WHERE m.mealDate = :date ORDER BY m.cafeteria, m.id")
    List<Meal> findByMealDateWithTranslations(@Param("date") LocalDate date);

    @Query("SELECT DISTINCT m FROM Meal m LEFT JOIN FETCH m.translations WHERE m.mealDate BETWEEN :start AND :end ORDER BY m.mealDate, m.cafeteria, m.id")
    List<Meal> findByMealDateBetweenWithTranslations(@Param("start") LocalDate start, @Param("end") LocalDate end);

    List<Meal> findByMealDateBefore(LocalDate date);

    @Query("SELECT m FROM Meal m WHERE m.translations IS EMPTY")
    List<Meal> findMealsWithNoTranslations();
}