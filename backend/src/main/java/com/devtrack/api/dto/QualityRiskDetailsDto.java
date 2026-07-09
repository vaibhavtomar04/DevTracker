package com.devtrack.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class QualityRiskDetailsDto {
    private Long crId;
    private String crNumber;
    private String crTitle;
    private boolean isQualityRisk;
    
    private long bugCount;
    private int thresholdBugs;
    private boolean bugThresholdExceeded;

    private int retestCount;
    private int thresholdRetests;
    private boolean retestThresholdExceeded;

    private long rejectedBugCount;
    private int thresholdRejectedBugs;
    private boolean rejectedBugsThresholdExceeded;

    private double challengeRate;
    private double thresholdChallengeRate;
    private boolean challengeRateThresholdExceeded;
}
