package com.devtrack.api.dto;

import com.devtrack.api.model.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSlimDto {
    private Long id;
    private String username;
    private String fullName;

    public static UserSlimDto from(User u) {
        return u == null ? null :
            UserSlimDto.builder().id(u.getId()).username(u.getUsername()).fullName(u.getFullName()).build();
    }
}
