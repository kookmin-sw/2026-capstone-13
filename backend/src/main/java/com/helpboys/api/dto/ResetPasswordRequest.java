package com.helpboys.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class ResetPasswordRequest {

    @NotBlank
    private String email;

    @NotBlank
    private String code;

    @NotBlank
    private String newPassword;
}