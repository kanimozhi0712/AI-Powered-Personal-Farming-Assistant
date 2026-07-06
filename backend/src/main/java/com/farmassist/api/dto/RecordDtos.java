package com.farmassist.api.dto;

import jakarta.validation.constraints.NotBlank;

public class RecordDtos {
    public record RecordRequest(@NotBlank String title, String content, String metadataJson, Long ownerId) {}
    public record AiChatRequest(@NotBlank String message, String language, String imageUrl, String historyJson) {}
    public record AiChatResponse(String answer, String provider, String safetyNote) {}
    public record WeatherRequest(String village, @NotBlank String district, @NotBlank String stateName) {}
    public record DailyWeather(String date, String condition, Double maxTemp, Double minTemp,
                               Double rainMm, Integer rainChance, Double windKph, Double evapotranspiration) {}
    public record WeatherForecastResponse(String location, String source, String currentCondition,
                                          Double temperature, Integer humidity, Double windKph, Double rainMm,
                                          String farmerAdvisory, java.util.List<DailyWeather> daily) {}
    public record IrrigationRequest(String village, @NotBlank String district, @NotBlank String stateName,
                                    @NotBlank String cropName, @NotBlank String soilType, String season,
                                    Double fieldAreaAcres, String irrigationMethod, Double currentMoisture) {}
    public record IrrigationScheduleDay(String date, String action, Double waterMm, Double waterLiters,
                                        String reason) {}
    public record IrrigationResponse(String location, String cropName, String soilType, String moistureStatus,
                                     Integer estimatedMoisturePercent, Double waterRequirementMm,
                                     Double waterRequirementLiters, String recommendation, String optimization,
                                     String nextIrrigation, java.util.List<IrrigationScheduleDay> schedule,
                                     String weatherSource, String note) {}
    public record FertilizerRequest(String village, @NotBlank String district, @NotBlank String stateName,
                                    @NotBlank String cropName, @NotBlank String soilType, String season,
                                    String cropStage, String nitrogenLevel, String phosphorusLevel,
                                    String potassiumLevel, String organicMatterLevel, Double soilPh) {}
    public record FertilizerDose(String nutrient, String status, String recommendation, String timing) {}
    public record FertilizerResponse(String location, String cropName, String soilType, String season,
                                     String soilAnalysis, String primaryRecommendation, String organicPlan,
                                     String applicationSchedule, String caution,
                                     java.util.List<FertilizerDose> doses, String note) {}
    public record MarketPriceRequest(String village, @NotBlank String district, @NotBlank String stateName,
                                     @NotBlank String commodity) {}
    public record MarketPriceRecord(String market, String commodity, String variety, String arrivalDate,
                                    Double minPrice, Double maxPrice, Double modalPrice, String unit) {}
    public record MarketPriceResponse(String location, String commodity, String source, Double averageModalPrice,
                                      String priceTrend, String sellingAdvice,
                                      java.util.List<MarketPriceRecord> prices, String note) {}
    public record SchemeRequest(String village, @NotBlank String district, @NotBlank String stateName,
                                String cropName, String purpose, String farmerType) {}
    public record SchemeMatch(String name, String category, String benefit, String eligibility,
                              String suitableFor, String applyLink, String googleSearchLink,
                              String documents, String priority) {}
    public record SchemeResponse(String location, String cropName, String purpose, String summary,
                                 java.util.List<SchemeMatch> schemes, String note) {}
    public record KnowledgeRequest(String village, String district, String stateName,
                                   String cropName, String topic, String season, String soilType) {}
    public record KnowledgeArticle(String title, String category, String summary, String recommendation,
                                   String expertTip, String priority) {}
    public record KnowledgeResponse(String location, String cropName, String topic, String summary,
                                    java.util.List<KnowledgeArticle> articles,
                                    java.util.List<String> agriculturalTips,
                                    java.util.List<String> expertRecommendations,
                                    String note) {}
    public record CropRecommendationRequest(String soilType, Double soilPh, String district, String stateName,
                                            String village, String climate, Double rainfall, Double temperature,
                                            Double humidity, String season) {}
    public record DiseaseDetectionResponse(String diseaseName, int confidence, String severity,
                                           String treatment, String prevention, String provider, String note) {}
}
