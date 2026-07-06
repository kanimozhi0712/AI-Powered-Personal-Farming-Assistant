package com.farmassist.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.farmassist.api.dto.RecordDtos.*;
import java.io.IOException;
import java.net.http.HttpClient;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

@Service
public class AgricultureIntelligenceService {
    private final String openAiKey;
    private final String openAiModel;
    private final String groqKey;
    private final String groqModel;
    private final String geminiKey;
    private final String geminiModel;
    private final String marketApiKey;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public AgricultureIntelligenceService(@Value("${app.ai.openai-api-key}") String openAiKey,
                                          @Value("${app.ai.openai-model}") String openAiModel,
                                          @Value("${app.ai.groq-api-key}") String groqKey,
                                          @Value("${app.ai.groq-model}") String groqModel,
                                          @Value("${app.ai.gemini-api-key}") String geminiKey,
                                          @Value("${app.ai.gemini-model}") String geminiModel,
                                          @Value("${app.integrations.market-api-key}") String marketApiKey,
                                          ObjectMapper objectMapper) {
        this.openAiKey = openAiKey;
        this.openAiModel = openAiModel;
        this.groqKey = groqKey;
        this.groqModel = groqModel;
        this.geminiKey = geminiKey;
        this.geminiModel = geminiModel;
        this.marketApiKey = marketApiKey;
        this.objectMapper = objectMapper;
        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .build();
        this.restClient = RestClient.builder()
                .requestFactory(new JdkClientHttpRequestFactory(httpClient))
                .defaultHeader(HttpHeaders.USER_AGENT, "FarmAI/1.0")
                .build();
    }

    public AiChatResponse chat(AiChatRequest request) {
        if (!groqKey.isBlank()) {
            return new AiChatResponse(callGroq(request), "Groq " + groqModel, safetyNote(request.language()));
        }
        if (!openAiKey.isBlank()) {
            return new AiChatResponse(callOpenAiChat(request), "OpenAI " + openAiModel, safetyNote(request.language()));
        }
        if (!geminiKey.isBlank()) {
            return new AiChatResponse(callGemini(request), "Gemini " + geminiModel, safetyNote(request.language()));
        }
        return new AiChatResponse(localAnswer(request), "local-advisory", noKeyNote(request.language()));
    }

    private String callGroq(AiChatRequest request) {
        try {
            Map<String, Object> body = Map.of(
                    "model", groqModel,
                    "temperature", 0.4,
                    "max_completion_tokens", 900,
                    "messages", List.of(
                            Map.of("role", "system", "content", systemPrompt(request.language())),
                            Map.of("role", "user", "content", request.message())
                    )
            );
            String response = restClient.post()
                    .uri("https://api.groq.com/openai/v1/chat/completions")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + groqKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);
            JsonNode root = objectMapper.readTree(response);
            return root.path("choices").path(0).path("message").path("content").asText("No AI response returned.");
        } catch (Exception ex) {
            return "AI provider error: " + ex.getMessage() + ". Please check the API key, model name, and internet connection.";
        }
    }

    private String callGemini(AiChatRequest request) {
        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", systemPrompt(request.language()) + "\n\nUser: " + request.message())))),
                "generationConfig", Map.of("temperature", 0.4, "maxOutputTokens", 900)
        );
        Exception lastError = null;
        for (String model : geminiModelCandidates()) {
            try {
                String response = postGemini(model, body);
                JsonNode root = objectMapper.readTree(response);
                return root.path("candidates").path(0).path("content").path("parts").path(0).path("text").asText("No AI response returned.");
            } catch (Exception ex) {
                if (isQuotaError(ex)) {
                    return "Gemini quota is exhausted right now. Please wait a minute, upgrade/check Google AI Studio quota, or use Groq for chat. " + localAnswer(request);
                }
                lastError = ex;
            }
        }
        return "AI provider error: " + (lastError == null ? "No Gemini response" : lastError.getMessage())
                + ". Please check GEMINI_MODEL, API key permissions, and internet connection.";
    }

    private String callOpenAiChat(AiChatRequest request) {
        try {
            Map<String, Object> body = Map.of(
                    "model", openAiModel,
                    "messages", List.of(
                            Map.of("role", "system", "content", systemPrompt(request.language())),
                            Map.of("role", "user", "content", request.message())
                    ),
                    "temperature", 0.4,
                    "max_completion_tokens", 900
            );
            String response = postOpenAi(body);
            JsonNode root = objectMapper.readTree(response);
            return root.path("choices").path(0).path("message").path("content").asText("No OpenAI response returned.");
        } catch (Exception ex) {
            return "OpenAI provider error: " + friendlyProviderError(ex) + ".";
        }
    }

    private String postOpenAi(Map<String, Object> body) {
        return restClient.post()
                .uri("https://api.openai.com/v1/chat/completions")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + openAiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(String.class);
    }

    private String postGemini(String model, Map<String, Object> body) {
        return restClient.post()
                .uri("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + geminiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(String.class);
    }

    private List<String> geminiModelCandidates() {
        return java.util.stream.Stream.of(geminiModel, "gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.0-flash-lite")
                .filter(model -> model != null && !model.isBlank())
                .distinct()
                .toList();
    }

    private String systemPrompt(String language) {
        String responseLanguage = language == null || language.isBlank() ? "English" : language;
        return """
                You are an AI Farming Assistant for Indian farmers, agricultural experts, and admins.
                Answer any user question clearly and helpfully.
                If the question is about farming, include practical crop, soil, irrigation, fertilizer, disease, pest, weather, market, or scheme guidance where relevant.
                If the question is not about farming, still answer normally, but keep it concise.
                Do not invent live weather, market prices, government deadlines, diagnoses, or legal/medical facts. Ask for location, crop, season, or image details when needed.
                Use simple language and respond in: %s.
                """.formatted(responseLanguage);
    }

    private String localAnswer(AiChatRequest request) {
        if (isTamil(request.language())) {
            return localTamilAnswer(request);
        }
        String question = request.message().toLowerCase();
        if (question.contains("disease") || question.contains("pest") || question.contains("leaf") || question.contains("blast")) {
            return "Please share crop name, affected part, leaf color/spots, weather, and a clear image. General first steps: isolate affected plants, avoid overhead watering, remove heavily infected leaves, and consult a local agriculture officer before spraying.";
        }
        if (question.contains("irrigation") || question.contains("water")) {
            return "Irrigation depends on crop stage, soil type, rainfall, and temperature. As a rule, water early morning or evening, avoid waterlogging, and check soil moisture 5-8 cm below the surface before irrigating.";
        }
        if (question.contains("fertilizer") || question.contains("npk")) {
            return "Use soil-test based fertilizer planning. Share crop, age/stage, soil type, and NPK values for exact advice. Avoid applying urea heavily at once; split doses usually work better.";
        }
        if (question.contains("market") || question.contains("price")) {
            return "For market advice, share crop, quantity, location, and harvest date. Compare local mandi prices, transport cost, storage life, and recent trend before selling.";
        }
        return "I can answer this better with a live AI key. For now: " + request.message()
                + ". Please add GROQ_API_KEY or GEMINI_API_KEY to enable full chatbot answers for any question.";
    }

    private String localTamilAnswer(AiChatRequest request) {
        String question = request.message().toLowerCase();
        if (question.contains("disease") || question.contains("pest") || question.contains("leaf") || question.contains("blast")
                || question.contains("நோய்") || question.contains("இலை") || question.contains("பூச்சி")) {
            return "பயிரின் பெயர், பாதிக்கப்பட்ட பகுதி, இலையின் நிறம்/புள்ளிகள், சமீபத்திய வானிலை, மற்றும் தெளிவான படத்தை பகிரவும். முதல் கட்டமாக பாதிக்கப்பட்ட இலைகளை அகற்றவும், அதிக நீர் தேங்காமல் பார்த்துக்கொள்ளவும், மருந்து தெளிப்பதற்கு முன் உள்ளூர் வேளாண்மை அலுவலரிடம் உறுதி செய்யவும்.";
        }
        if (question.contains("irrigation") || question.contains("water") || question.contains("நீர்") || question.contains("பாசனம்")) {
            return "பாசனம் பயிரின் நிலை, மண் வகை, மழை, வெப்பநிலை ஆகியவற்றைப் பொறுத்தது. பொதுவாக காலை அல்லது மாலை நேரத்தில் நீர் விடவும். நீர் தேங்க விடாதீர்கள். மண்ணில் 5-8 செ.மீ. ஆழத்தில் ஈரம் இருக்கிறதா என்று பார்த்த பிறகு பாசனம் செய்யவும்.";
        }
        if (question.contains("fertilizer") || question.contains("npk") || question.contains("உரம்")) {
            return "சரியான உர பரிந்துரைக்கு மண் பரிசோதனை முக்கியம். பயிர் பெயர், வளர்ச்சி நிலை, மண் வகை, NPK மதிப்புகள் இருந்தால் பகிரவும். யூரியாவை ஒரே நேரத்தில் அதிகமாக போடாமல், பிரித்து அளிப்பது நல்லது.";
        }
        if (question.contains("market") || question.contains("price") || question.contains("விலை") || question.contains("சந்தை")) {
            return "சந்தை ஆலோசனைக்கு பயிர், அளவு, இடம், அறுவடை தேதி ஆகியவை தேவை. விற்பனைக்கு முன் அருகிலுள்ள மண்டி விலை, போக்குவரத்து செலவு, சேமிப்பு நாட்கள், சமீபத்திய விலை போக்கு ஆகியவற்றை ஒப்பிடுங்கள்.";
        }
        return "முழுமையான AI பதில்களுக்கு GROQ_API_KEY அல்லது GEMINI_API_KEY சேர்க்க வேண்டும். இப்போது உங்கள் கேள்விக்கான அடிப்படை உதவி: " + request.message()
                + ". பயிர், இடம், பருவம், மண் வகை போன்ற விவரங்களை கொடுத்தால் இன்னும் துல்லியமாக உதவ முடியும்.";
    }

    private boolean isTamil(String language) {
        return language != null && language.equalsIgnoreCase("Tamil");
    }

    private String noKeyNote(String language) {
        if (isTamil(language)) {
            return "முழுமையான AI பதில்களுக்கு GROQ_API_KEY அல்லது GEMINI_API_KEY சேர்க்கவும்.";
        }
        return "Add GROQ_API_KEY or GEMINI_API_KEY for full AI answers.";
    }

    private String safetyNote(String language) {
        if (isTamil(language)) {
            return "AI ஆலோசனையை உள்ளூர் பயிர் நிலை, மருந்து லேபிள், மற்றும் நிபுணர் ஆலோசனையுடன் சரிபார்க்கவும்.";
        }
        return "AI guidance should be verified for local crop conditions, labels, and expert advice.";
    }

    public String cropRecommendation(CropRecommendationRequest request) {
        String soil = safeLower(request.soilType());
        String season = safeLower(request.season());
        ClimateEstimate estimate = estimateClimate(request.stateName(), request.season());
        String climate = request.climate() == null || request.climate().isBlank() ? estimate.climate() : request.climate();
        String climateLower = safeLower(climate);
        double rainfall = request.rainfall() == null ? estimate.rainfall() : request.rainfall();
        double temperature = request.temperature() == null ? estimate.temperature() : request.temperature();
        double humidity = request.humidity() == null ? estimate.humidity() : request.humidity();
        boolean phProvided = request.soilPh() != null;
        double ph = phProvided ? request.soilPh() : 6.8;

        List<String> crops = new java.util.ArrayList<>();
        List<String> tips = new java.util.ArrayList<>();

        if (soil.contains("clay") || soil.contains("black")) {
            crops.addAll(List.of("Paddy/Rice", "Cotton", "Sugarcane", "Soybean", "Sorghum"));
            tips.add("Clay/black soil holds water well. Use drainage channels for heavy rain and avoid waterlogging for cotton/soybean.");
        } else if (soil.contains("sandy")) {
            crops.addAll(List.of("Groundnut", "Watermelon", "Millets", "Cowpea", "Sesame"));
            tips.add("Sandy soil drains quickly. Use mulching, compost, and short irrigation intervals.");
        } else if (soil.contains("loam")) {
            crops.addAll(List.of("Wheat", "Maize", "Vegetables", "Pulses", "Mustard"));
            tips.add("Loamy soil is flexible. Rotate cereal crops with pulses to improve soil fertility.");
        } else if (soil.contains("red")) {
            crops.addAll(List.of("Groundnut", "Ragi/Finger millet", "Pulses", "Cotton", "Chilli"));
            tips.add("Red soil often needs organic matter. Add FYM/compost and follow soil-test based fertilizer.");
        } else {
            crops.addAll(List.of("Maize", "Pulses", "Millets", "Vegetables", "Oilseeds"));
            tips.add("Soil type is unclear. Confirm with a soil test for more accurate crop planning.");
        }

        if (season.contains("kharif") || season.contains("monsoon")) {
            crops.addAll(List.of("Rice", "Maize", "Cotton", "Soybean", "Groundnut", "Bajra"));
            tips.add("For Kharif, select varieties that match local rainfall and sow after stable monsoon onset.");
        } else if (season.contains("rabi") || season.contains("winter")) {
            crops.addAll(List.of("Wheat", "Mustard", "Gram/Chickpea", "Pea", "Barley"));
            tips.add("For Rabi, plan irrigation at crown root initiation, flowering, and grain filling stages where applicable.");
        } else if (season.contains("zaid") || season.contains("summer")) {
            crops.addAll(List.of("Watermelon", "Muskmelon", "Cucumber", "Moong", "Fodder maize"));
            tips.add("For summer crops, use mulching and drip irrigation where possible to reduce water stress.");
        }

        if (rainfall >= 900 || climateLower.contains("humid") || humidity >= 75) {
            crops.addAll(List.of("Rice", "Banana", "Turmeric", "Ginger"));
            tips.add("High humidity/rainfall increases fungal disease risk. Keep spacing, drainage, and preventive scouting strong.");
        } else if (rainfall >= 0 && rainfall < 550 || climateLower.contains("dry") || climateLower.contains("arid")) {
            crops.addAll(List.of("Pearl millet/Bajra", "Sorghum/Jowar", "Pigeon pea", "Sesame", "Cluster bean"));
            tips.add("Low rainfall area: prefer drought-tolerant crops, seed treatment, mulching, and moisture conservation.");
        }

        if (temperature >= 32) {
            crops.addAll(List.of("Millets", "Cotton", "Groundnut", "Sesame"));
            tips.add("High temperature: avoid sowing during heat waves and ensure life-saving irrigation at sensitive stages.");
        } else if (temperature > 0 && temperature <= 22) {
            crops.addAll(List.of("Wheat", "Mustard", "Pea", "Potato"));
            tips.add("Cool climate suits Rabi crops. Protect seedlings from frost where winter nights are very cold.");
        }

        if (ph < 6.0) {
            crops.addAll(List.of("Rice", "Potato", "Tea where suitable", "Pineapple where suitable"));
            tips.add("Soil pH is acidic. Apply lime only after soil-test recommendation.");
        } else if (ph > 7.8) {
            crops.addAll(List.of("Barley", "Mustard", "Cotton", "Date palm where suitable"));
            tips.add("Soil pH is alkaline. Add organic matter and check micronutrient deficiency, especially zinc/iron.");
        }

        List<String> uniqueCrops = crops.stream().distinct().limit(8).toList();
        String location = String.join(", ", java.util.stream.Stream.of(request.village(), request.district(), request.stateName())
                .filter(value -> value != null && !value.isBlank())
                .toList());

        return """
                Crop recommendation for %s

                Best suitable crops:
                - %s

                Input summary:
                Soil: %s | pH: %s | Season: %s | Climate: %s | Rainfall: %s mm | Temperature: %s C | Humidity: %s%%

                Farming tips:
                - %s

                Note: This recommendation uses soil, season, climate, and location inputs. For final crop selection, confirm seed variety, water availability, local mandi demand, and soil-test results.
                """.formatted(
                location.isBlank() ? "your selected place" : location,
                String.join("\n- ", uniqueCrops),
                blankDefault(request.soilType(), "Not provided"),
                phProvided ? String.format("%.1f", ph) : "Unknown (neutral estimate used)",
                blankDefault(request.season(), "Not provided"),
                climate + (request.climate() == null || request.climate().isBlank() ? " (estimated)" : ""),
                request.rainfall() == null ? rainfall + " (estimated)" : request.rainfall().toString(),
                request.temperature() == null ? temperature + " (estimated)" : request.temperature().toString(),
                request.humidity() == null ? humidity + " (estimated)" : request.humidity().toString(),
                String.join("\n- ", tips.stream().distinct().limit(5).toList())
        );
    }

    private ClimateEstimate estimateClimate(String stateName, String seasonName) {
        String state = safeLower(stateName);
        String season = safeLower(seasonName);
        boolean kharif = season.contains("kharif") || season.contains("monsoon");
        boolean rabi = season.contains("rabi") || season.contains("winter");
        if (state.contains("kerala") || state.contains("tamil nadu") || state.contains("andhra") || state.contains("odisha") || state.contains("west bengal")) {
            return new ClimateEstimate("Humid", kharif ? 1100 : 750, rabi ? 25 : 30, 78);
        }
        if (state.contains("rajasthan") || state.contains("gujarat") || state.contains("haryana") || state.contains("punjab")) {
            return new ClimateEstimate("Dry / Arid", kharif ? 520 : 280, rabi ? 20 : 34, 42);
        }
        if (state.contains("madhya") || state.contains("maharashtra") || state.contains("telangana") || state.contains("karnataka")) {
            return new ClimateEstimate("Semi-arid", kharif ? 780 : 450, rabi ? 23 : 31, 58);
        }
        return new ClimateEstimate("Tropical", kharif ? 850 : 500, rabi ? 22 : 30, 62);
    }

    private record ClimateEstimate(String climate, double rainfall, double temperature, double humidity) {}

    private String safeLower(String value) {
        return value == null ? "" : value.toLowerCase();
    }

    private double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private String blankDefault(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value;
    }

    public DiseaseDetectionResponse detectDisease(MultipartFile image, String cropName, String symptoms) {
        if (image == null || image.isEmpty()) {
            throw new IllegalArgumentException("Crop or leaf image is required");
        }
        if (!openAiKey.isBlank()) {
            return detectDiseaseWithOpenAi(image, cropName, symptoms);
        }
        if (!geminiKey.isBlank()) {
            return detectDiseaseWithGemini(image, cropName, symptoms);
        }
        return localDiseaseFallback(cropName, symptoms);
    }

    private DiseaseDetectionResponse detectDiseaseWithOpenAi(MultipartFile image, String cropName, String symptoms) {
        try {
            String mimeType = image.getContentType() == null ? MediaType.IMAGE_JPEG_VALUE : image.getContentType();
            String base64 = Base64.getEncoder().encodeToString(image.getBytes());
            String prompt = """
                    Analyze this crop or leaf image for plant disease.
                    Return only JSON with these keys:
                    diseaseName, confidence, severity, treatment, prevention, note.
                    If the image is unclear, use diseaseName "Unclear image" and tell the farmer to upload a sharper close-up.
                    Crop name: %s
                    Farmer symptoms: %s
                    Keep treatment practical for Indian farmers and mention local expert verification.
                    """.formatted(blankDefault(cropName, "Unknown"), blankDefault(symptoms, "Not provided"));
            Map<String, Object> imagePart = Map.of(
                    "type", "image_url",
                    "image_url", Map.of("url", "data:" + mimeType + ";base64," + base64)
            );
            Map<String, Object> body = Map.of(
                    "model", openAiModel,
                    "messages", List.of(Map.of(
                            "role", "user",
                            "content", List.of(Map.of("type", "text", "text", prompt), imagePart)
                    )),
                    "response_format", Map.of("type", "json_object"),
                    "max_completion_tokens", 700
            );
            String response = postOpenAi(body);
            String text = objectMapper.readTree(response)
                    .path("choices").path(0).path("message").path("content").asText("{}");
            DiseaseDetectionResponse parsed = parseDiseaseJson(text);
            return new DiseaseDetectionResponse(parsed.diseaseName(), parsed.confidence(), parsed.severity(),
                    parsed.treatment(), parsed.prevention(), "OpenAI Vision " + openAiModel, parsed.note());
        } catch (IOException ex) {
            return new DiseaseDetectionResponse("Image read error", 0, "Unknown",
                    "Upload a clear image under 10 MB and try again.",
                    "Use a sharp close-up of the affected leaf or crop part.",
                    "OpenAI Vision", ex.getMessage());
        } catch (Exception ex) {
            DiseaseDetectionResponse fallback = localDiseaseFallback(cropName, symptoms);
            return new DiseaseDetectionResponse(
                    fallback.diseaseName(),
                    fallback.confidence(),
                    fallback.severity(),
                    fallback.treatment(),
                    fallback.prevention(),
                    "local-fallback after OpenAI error",
                    "OpenAI vision failed: " + friendlyProviderError(ex)
            );
        }
    }

    private DiseaseDetectionResponse detectDiseaseWithGemini(MultipartFile image, String cropName, String symptoms) {
        try {
            String mimeType = image.getContentType() == null ? MediaType.IMAGE_JPEG_VALUE : image.getContentType();
            String base64 = Base64.getEncoder().encodeToString(image.getBytes());
            String prompt = """
                    You are a crop disease detection assistant. Analyze the plant/leaf image and return only JSON with:
                    diseaseName, confidence, severity, treatment, prevention, note.
                    If the image is unclear, say "Unclear image" and ask for a clearer leaf photo.
                    Crop name: %s
                    Farmer symptoms: %s
                    Keep treatment practical for Indian farmers and mention local expert verification.
                    """.formatted(blankDefault(cropName, "Unknown"), blankDefault(symptoms, "Not provided"));
            Map<String, Object> body = Map.of(
                    "contents", List.of(Map.of("parts", List.of(
                            Map.of("text", prompt),
                            Map.of("inline_data", Map.of("mime_type", mimeType, "data", base64))
                    ))),
                    "generationConfig", Map.of("temperature", 0.2, "maxOutputTokens", 700)
            );
            Exception lastError = null;
            for (String model : geminiModelCandidates()) {
                try {
                    String response = postGemini(model, body);
                    String text = objectMapper.readTree(response)
                            .path("candidates").path(0).path("content").path("parts").path(0).path("text")
                            .asText("{}");
                    DiseaseDetectionResponse parsed = parseDiseaseJson(text);
                    return new DiseaseDetectionResponse(parsed.diseaseName(), parsed.confidence(), parsed.severity(),
                            parsed.treatment(), parsed.prevention(), "Gemini Vision " + model, parsed.note());
                } catch (Exception ex) {
                    if (isQuotaError(ex)) {
                        DiseaseDetectionResponse fallback = localDiseaseFallback(cropName, symptoms);
                        return new DiseaseDetectionResponse(
                                fallback.diseaseName(),
                                fallback.confidence(),
                                fallback.severity(),
                                fallback.treatment(),
                                fallback.prevention(),
                                "local-fallback after Gemini quota limit",
                                "Gemini quota is exhausted for this key/project. Retry after the quota window resets, enable billing, request quota, or use another Gemini key."
                        );
                    }
                    lastError = ex;
                }
            }
            return new DiseaseDetectionResponse("AI analysis failed", 0, "Unknown",
                    "Gemini model was not available. Set GEMINI_MODEL to a model listed in your Google AI Studio account.",
                    "Try again after updating GEMINI_MODEL, or use local fallback without Gemini.",
                    "Gemini Vision", lastError == null ? "No Gemini response" : lastError.getMessage());
        } catch (IOException ex) {
            return new DiseaseDetectionResponse("Image read error", 0, "Unknown",
                    "Upload a clear image under 10 MB and try again.",
                    "Use a sharp close-up of the affected leaf or crop part.",
                    "Gemini Vision", ex.getMessage());
        } catch (Exception ex) {
            return new DiseaseDetectionResponse("AI analysis failed", 0, "Unknown",
                    "Check GEMINI_API_KEY, internet connection, and image format.",
                    "Try again with a clear JPG/PNG leaf image.",
                    "Gemini Vision", ex.getMessage());
        }
    }

    private boolean isQuotaError(Exception ex) {
        if (ex instanceof RestClientResponseException responseException && responseException.getStatusCode().value() == 429) {
            return true;
        }
        String message = ex.getMessage();
        return message != null && (message.contains("429") || message.contains("RESOURCE_EXHAUSTED") || message.contains("quota"));
    }

    private String friendlyProviderError(Exception ex) {
        if (isQuotaError(ex)) {
            return "quota or rate limit reached";
        }
        if (ex instanceof RestClientResponseException responseException) {
            return "HTTP " + responseException.getStatusCode().value() + " from provider";
        }
        return ex.getMessage() == null ? "provider request failed" : ex.getMessage();
    }

    private DiseaseDetectionResponse parseDiseaseJson(String text) throws IOException {
        String cleaned = text.replace("```json", "").replace("```", "").trim();
        JsonNode node = objectMapper.readTree(cleaned);
        return new DiseaseDetectionResponse(
                node.path("diseaseName").asText("Unknown disease"),
                node.path("confidence").asInt(60),
                node.path("severity").asText("Moderate"),
                node.path("treatment").asText("Remove affected leaves and consult a local agriculture expert before spraying."),
                node.path("prevention").asText("Use clean seed, proper spacing, field sanitation, and avoid waterlogging."),
                "Gemini Vision",
                node.path("note").asText("AI diagnosis should be verified locally.")
        );
    }

    private DiseaseDetectionResponse localDiseaseFallback(String cropName, String symptoms) {
        String symptomText = safeLower(symptoms);
        String disease = "Possible leaf spot / fungal infection";
        String treatment = "Remove heavily affected leaves, avoid overhead watering, improve airflow, and consult the nearest agriculture officer before using fungicide.";
        if (symptomText.contains("yellow")) {
            disease = "Possible nutrient deficiency or yellow mosaic";
            treatment = "Check for sucking pests under leaves, improve balanced nutrition, and verify with a local expert before treatment.";
        } else if (symptomText.contains("white") || symptomText.contains("powder")) {
            disease = "Possible powdery mildew";
            treatment = "Improve spacing and airflow. Avoid wetting leaves. Use recommended fungicide only after local expert confirmation.";
        } else if (symptomText.contains("black") || symptomText.contains("brown")) {
            disease = "Possible blight or leaf spot";
            treatment = "Remove infected plant parts, avoid waterlogging, and use crop-specific fungicide after expert advice.";
        }
        return new DiseaseDetectionResponse(
                disease,
                45,
                "Needs clear AI image check",
                treatment,
                "Use disease-free seed, rotate crops, keep field clean, monitor weekly, and avoid excess nitrogen.",
                "local-image-fallback",
                "Add GEMINI_API_KEY for real image-based disease identification. This fallback uses symptoms only and is not a confirmed diagnosis for " + blankDefault(cropName, "the crop") + "."
        );
    }

    public WeatherForecastResponse weather(WeatherRequest request) {
        List<String> queries = weatherLocationQueries(request);
        Exception lastError = null;
        for (String query : queries) {
            try {
                GeoPoint point = geocode(query);
                return fetchOpenMeteoForecast(point, query);
            } catch (Exception ex) {
                lastError = ex;
            }
        }
        return estimatedWeather(request, lastError == null ? "Location not found" : lastError.getMessage());
    }

    public IrrigationResponse irrigation(IrrigationRequest request) {
        WeatherForecastResponse forecast = weather(new WeatherRequest(request.village(), request.district(), request.stateName()));
        String soil = safeLower(request.soilType());
        String crop = safeLower(request.cropName());
        double area = request.fieldAreaAcres() == null || request.fieldAreaAcres() <= 0 ? 1.0 : request.fieldAreaAcres();
        double efficiency = irrigationEfficiency(request.irrigationMethod());
        int moisture = request.currentMoisture() == null
                ? estimateSoilMoisture(soil, forecast)
                : (int) Math.round(clamp(request.currentMoisture(), 5, 100));
        double baseDemand = cropWaterDemand(crop, request.season());
        double soilFactor = soilWaterFactor(soil);
        double rainCredit = forecast.daily().stream().limit(3).mapToDouble(DailyWeather::rainMm).sum() * 0.65;
        double etLoss = forecast.daily().stream().limit(3)
                .mapToDouble(day -> day.evapotranspiration() == null ? 4.0 : day.evapotranspiration())
                .average().orElse(4.0);
        double moistureDeficit = Math.max(0, 55 - moisture) * 0.45;
        double requiredMm = Math.max(0, round1((baseDemand * soilFactor) + etLoss + moistureDeficit - rainCredit));
        double liters = round1(requiredMm * area * 4046.86 / efficiency);
        String status = moistureStatus(moisture);
        String recommendation = irrigationRecommendation(requiredMm, moisture, forecast);
        String optimization = waterOptimization(request.irrigationMethod(), soil, forecast);
        List<IrrigationScheduleDay> schedule = irrigationSchedule(forecast, requiredMm, area, efficiency, moisture);
        String next = schedule.stream()
                .filter(day -> day.waterMm() > 0)
                .findFirst()
                .map(day -> day.date() + " - " + day.action())
                .orElse("No irrigation needed in the next 7 days unless soil becomes dry.");

        return new IrrigationResponse(
                forecast.location(),
                request.cropName(),
                request.soilType(),
                status,
                moisture,
                requiredMm,
                liters,
                recommendation,
                optimization,
                next,
                schedule,
                forecast.source(),
                "Automatic estimate uses weather forecast, soil type, crop water demand, rainfall, ET0, and field area. Verify with field soil touch test or a moisture sensor when possible."
        );
    }

    private int estimateSoilMoisture(String soil, WeatherForecastResponse forecast) {
        double recentRain = forecast.daily().stream().limit(2).mapToDouble(DailyWeather::rainMm).sum();
        double humidity = forecast.humidity() == null ? 60 : forecast.humidity();
        double temp = forecast.temperature() == null ? 30 : forecast.temperature();
        double base = soil.contains("clay") || soil.contains("black") ? 62
                : soil.contains("sandy") ? 38
                : soil.contains("red") || soil.contains("laterite") ? 44
                : 52;
        double moisture = base + (recentRain * 2.4) + ((humidity - 55) * 0.25) - Math.max(0, temp - 30) * 1.4;
        return (int) Math.round(clamp(moisture, 15, 88));
    }

    private double cropWaterDemand(String crop, String seasonName) {
        double demand = 5.0;
        if (crop.contains("paddy") || crop.contains("rice") || crop.contains("sugarcane")) demand = 8.0;
        else if (crop.contains("banana") || crop.contains("turmeric")) demand = 6.5;
        else if (crop.contains("cotton") || crop.contains("maize") || crop.contains("tomato") || crop.contains("chilli")) demand = 5.8;
        else if (crop.contains("groundnut") || crop.contains("pulse") || crop.contains("millet")) demand = 4.2;
        String season = safeLower(seasonName);
        if (season.contains("summer") || season.contains("zaid")) demand += 1.2;
        if (season.contains("monsoon") || season.contains("kharif")) demand -= 0.7;
        return Math.max(2.5, demand);
    }

    private double soilWaterFactor(String soil) {
        if (soil.contains("sandy")) return 1.18;
        if (soil.contains("clay") || soil.contains("black")) return 0.86;
        if (soil.contains("red") || soil.contains("laterite")) return 1.08;
        return 1.0;
    }

    private double irrigationEfficiency(String method) {
        String value = safeLower(method);
        if (value.contains("drip")) return 0.9;
        if (value.contains("sprinkler")) return 0.78;
        if (value.contains("furrow")) return 0.65;
        if (value.contains("flood")) return 0.55;
        return 0.7;
    }

    private String moistureStatus(int moisture) {
        if (moisture < 35) return "Low moisture";
        if (moisture < 55) return "Moderate moisture";
        if (moisture <= 75) return "Good moisture";
        return "High moisture";
    }

    private String irrigationRecommendation(double requiredMm, int moisture, WeatherForecastResponse forecast) {
        boolean rainSoon = forecast.daily().stream().limit(2)
                .anyMatch(day -> day.rainMm() >= 5 || (day.rainChance() != null && day.rainChance() >= 60));
        if (rainSoon) return "Rain is likely soon. Postpone irrigation and check soil moisture after rainfall.";
        if (requiredMm <= 0 || moisture > 72) return "Do not irrigate now. Soil has enough moisture for the next short period.";
        if (moisture < 35) return "Irrigate today, preferably early morning or evening, because estimated soil moisture is low.";
        return "Give light to moderate irrigation based on crop stage. Avoid waterlogging and recheck soil after 24 hours.";
    }

    private String waterOptimization(String method, String soil, WeatherForecastResponse forecast) {
        List<String> tips = new java.util.ArrayList<>();
        String value = safeLower(method);
        if (!value.contains("drip")) tips.add("Use drip or furrow irrigation where possible to reduce water loss.");
        if (soil.contains("sandy")) tips.add("Split irrigation into smaller frequent doses and use mulch.");
        if (soil.contains("clay") || soil.contains("black")) tips.add("Irrigate slowly and keep drainage channels open.");
        if (forecast.windKph() != null && forecast.windKph() >= 25) tips.add("Avoid sprinkler irrigation during high wind.");
        tips.add("Irrigate before 9 AM or after 5 PM to reduce evaporation.");
        return String.join(" ", tips);
    }

    private List<IrrigationScheduleDay> irrigationSchedule(WeatherForecastResponse forecast, double requiredMm,
                                                           double area, double efficiency, int startingMoisture) {
        List<IrrigationScheduleDay> schedule = new java.util.ArrayList<>();
        double remaining = requiredMm;
        int moisture = startingMoisture;
        for (DailyWeather day : forecast.daily()) {
            boolean rainy = day.rainMm() >= 5 || (day.rainChance() != null && day.rainChance() >= 65);
            double water = 0;
            String action = "Monitor";
            String reason = "Check soil by hand near root zone.";
            if (rainy) {
                action = "Skip irrigation";
                reason = "Rain is expected or forecast rainfall is enough.";
                moisture = Math.min(90, moisture + 12);
            } else if (remaining > 0 && moisture < 65) {
                water = round1(Math.min(remaining, moisture < 35 ? 8.0 : 5.0));
                action = water >= 7 ? "Irrigate deeply" : "Light irrigation";
                reason = "Forecast is dry and estimated root-zone moisture needs support.";
                remaining = Math.max(0, remaining - water);
                moisture = Math.min(80, moisture + 10);
            } else {
                moisture = Math.max(20, moisture - 5);
            }
            schedule.add(new IrrigationScheduleDay(day.date(), action, water,
                    round1(water * area * 4046.86 / efficiency), reason));
        }
        return schedule;
    }

    public FertilizerResponse fertilizer(FertilizerRequest request) {
        String location = joinLocation(request.village(), request.district(), request.stateName());
        String crop = safeLower(request.cropName());
        String soil = safeLower(request.soilType());
        String season = blankDefault(request.season(), "Season not provided");
        String stage = blankDefault(request.cropStage(), "General growth stage");
        String nitrogen = nutrientStatus(request.nitrogenLevel(), crop, "nitrogen");
        String phosphorus = nutrientStatus(request.phosphorusLevel(), crop, "phosphorus");
        String potassium = nutrientStatus(request.potassiumLevel(), crop, "potassium");
        String organicMatter = nutrientStatus(request.organicMatterLevel(), soil, "organic");
        double ph = request.soilPh() == null ? estimatePh(soil) : request.soilPh();

        List<FertilizerDose> doses = List.of(
                new FertilizerDose("Nitrogen (N)", nitrogen, nitrogenRecommendation(crop, nitrogen), nitrogenTiming(crop, stage)),
                new FertilizerDose("Phosphorus (P)", phosphorus, phosphorusRecommendation(crop, phosphorus), "Apply mostly as basal dose before sowing/transplanting."),
                new FertilizerDose("Potassium (K)", potassium, potassiumRecommendation(crop, potassium), "Apply basal dose and split the rest near flowering/fruiting where needed."),
                new FertilizerDose("Organic matter", organicMatter, organicRecommendation(soil, organicMatter), "Add before land preparation or as compost around root zone.")
        );

        String primary = primaryFertilizerPlan(crop, soil, nitrogen, phosphorus, potassium);
        String organic = "Use well-decomposed FYM/compost, green manure, crop residue mulch, and biofertilizers such as Azospirillum/Rhizobium/PSB based on crop type.";
        String schedule = fertilizerSchedule(crop, stage);
        String caution = fertilizerCaution(ph, soil, season);
        String analysis = "Estimated soil analysis: N=" + nitrogen + ", P=" + phosphorus + ", K=" + potassium
                + ", organic matter=" + organicMatter + ", pH=" + round1(ph) + ".";

        return new FertilizerResponse(
                location.isBlank() ? "selected place" : location,
                request.cropName(),
                request.soilType(),
                season,
                analysis,
                primary,
                organic,
                schedule,
                caution,
                doses,
                "For exact dose, use a soil test report and local agriculture department recommendation. This prediction is practical guidance for farmers when lab values are not available."
        );
    }

    private String nutrientStatus(String provided, String context, String nutrient) {
        if (provided != null && !provided.isBlank()) {
            return provided;
        }
        String value = safeLower(context);
        if (nutrient.equals("nitrogen")) {
            if (value.contains("paddy") || value.contains("rice") || value.contains("maize") || value.contains("sugarcane")) return "Low";
            return "Medium";
        }
        if (nutrient.equals("phosphorus")) {
            if (value.contains("red") || value.contains("laterite")) return "Low";
            return "Medium";
        }
        if (nutrient.equals("potassium")) {
            if (value.contains("sandy") || value.contains("banana") || value.contains("tomato")) return "Low";
            return "Medium";
        }
        if (value.contains("sandy") || value.contains("red") || value.contains("laterite")) return "Low";
        return "Medium";
    }

    private double estimatePh(String soil) {
        if (soil.contains("black") || soil.contains("clay")) return 7.4;
        if (soil.contains("red") || soil.contains("laterite")) return 6.1;
        if (soil.contains("sandy")) return 6.5;
        return 6.8;
    }

    private String nitrogenRecommendation(String crop, String status) {
        String amount = status.equalsIgnoreCase("Low") ? "higher split nitrogen dose" : "moderate split nitrogen dose";
        if (crop.contains("pulse") || crop.contains("gram") || crop.contains("bean")) {
            return "Use small starter nitrogen only. Prefer Rhizobium seed treatment because pulses fix nitrogen.";
        }
        return "Use " + amount + " through urea or crop-specific N fertilizer. Avoid applying all nitrogen at once.";
    }

    private String phosphorusRecommendation(String crop, String status) {
        if (status.equalsIgnoreCase("High")) return "Avoid extra DAP/SSP unless soil test recommends it.";
        return "Use DAP/SSP or rock phosphate source as basal phosphorus. For pulses and oilseeds, SSP also supports sulphur need.";
    }

    private String potassiumRecommendation(String crop, String status) {
        if (crop.contains("banana") || crop.contains("tomato") || crop.contains("chilli") || crop.contains("cotton")) {
            return "Potassium is important for fruit quality, boll/fruit setting, and stress tolerance. Use MOP/SOP as split dose.";
        }
        if (status.equalsIgnoreCase("High")) return "Keep potassium low and maintain with organic matter.";
        return "Use MOP as basal or split dose based on crop stage and soil test.";
    }

    private String organicRecommendation(String soil, String status) {
        if (status.equalsIgnoreCase("Low") || soil.contains("sandy") || soil.contains("red")) {
            return "Add 2-5 tons/acre well-decomposed FYM or compost where available, plus mulch to improve moisture and nutrient holding.";
        }
        return "Maintain organic matter with compost, crop residues, green manure, and reduced burning of residues.";
    }

    private String nitrogenTiming(String crop, String stage) {
        String lowerStage = safeLower(stage);
        if (crop.contains("paddy") || crop.contains("rice")) return "Split at basal, active tillering, and panicle initiation. Avoid urea before heavy rain.";
        if (crop.contains("maize")) return "Split at sowing, knee-high stage, and tasseling.";
        if (crop.contains("vegetable") || crop.contains("tomato") || crop.contains("chilli")) return "Apply in small repeated doses after establishment, flowering, and fruiting.";
        if (lowerStage.contains("flower") || lowerStage.contains("fruit")) return "Reduce excess nitrogen now; balance with potassium.";
        return "Split after establishment and at rapid vegetative growth.";
    }

    private String primaryFertilizerPlan(String crop, String soil, String nitrogen, String phosphorus, String potassium) {
        List<String> plan = new java.util.ArrayList<>();
        plan.add("Base the fertilizer on crop demand and current nutrient status.");
        if (nitrogen.equalsIgnoreCase("Low")) plan.add("Nitrogen is likely limiting, so plan split urea/N application.");
        if (phosphorus.equalsIgnoreCase("Low")) plan.add("Add basal phosphorus before sowing/transplanting.");
        if (potassium.equalsIgnoreCase("Low")) plan.add("Add potassium for root strength, quality, and stress tolerance.");
        if (soil.contains("sandy")) plan.add("Use smaller, more frequent doses because sandy soil loses nutrients quickly.");
        if (crop.contains("paddy") || crop.contains("rice")) plan.add("For paddy, avoid fertilizer application in standing deep water or before heavy rain.");
        return String.join(" ", plan);
    }

    private String fertilizerSchedule(String crop, String stage) {
        if (safeLower(crop).contains("paddy") || safeLower(crop).contains("rice")) {
            return "Basal dose before transplanting/sowing, first top-dress at tillering, second top-dress at panicle initiation.";
        }
        if (safeLower(crop).contains("tomato") || safeLower(crop).contains("chilli") || safeLower(crop).contains("vegetable")) {
            return "Basal compost + phosphorus first, then split nitrogen and potassium every 15-20 days during growth and fruiting.";
        }
        if (safeLower(crop).contains("pulse")) {
            return "Seed treatment first, basal phosphorus at sowing, avoid heavy nitrogen later.";
        }
        return "Apply organic manure before land preparation, basal P/K at sowing, and split nitrogen during active growth.";
    }

    private String fertilizerCaution(double ph, String soil, String season) {
        List<String> cautions = new java.util.ArrayList<>();
        if (ph < 6.0) cautions.add("Soil is acidic; lime may be needed only after local recommendation.");
        if (ph > 7.8) cautions.add("Soil is alkaline; zinc/iron deficiency risk can increase.");
        if (soil.contains("clay") || soil.contains("black")) cautions.add("Avoid over-irrigation after fertilizer because nutrients can become unavailable or roots may suffer.");
        if (safeLower(season).contains("monsoon") || safeLower(season).contains("kharif")) cautions.add("Do not apply fertilizer just before heavy rain.");
        cautions.add("Keep fertilizer away from direct seed contact unless it is recommended for that crop.");
        return String.join(" ", cautions);
    }

    public MarketPriceResponse marketPrices(MarketPriceRequest request) {
        try {
            List<MarketPriceRecord> records = fetchMarketPrices(request);
            if (!records.isEmpty()) {
                return marketResponse(request, records, "data.gov.in live mandi prices", "Live mandi records from public market-price data.");
            }
            return estimatedMarketPrices(request, "No live mandi record matched this district/crop today.");
        } catch (Exception ex) {
            return estimatedMarketPrices(request, friendlyProviderError(ex));
        }
    }

    private List<MarketPriceRecord> fetchMarketPrices(MarketPriceRequest request) throws IOException {
        String apiKey = marketApiKey == null || marketApiKey.isBlank() ? "579b464db66ec23bdd000001" : marketApiKey;
        String resource = "9ef84268-d588-465a-a308-a864a43d0070";
        String uri = "https://api.data.gov.in/resource/" + resource
                + "?api-key=" + URLEncoder.encode(apiKey, StandardCharsets.UTF_8)
                + "&format=json&limit=20"
                + "&filters[state]=" + URLEncoder.encode(request.stateName(), StandardCharsets.UTF_8)
                + "&filters[district]=" + URLEncoder.encode(request.district(), StandardCharsets.UTF_8)
                + "&filters[commodity]=" + URLEncoder.encode(request.commodity(), StandardCharsets.UTF_8);
        String response = restClient.get().uri(uri).retrieve().body(String.class);
        JsonNode rows = objectMapper.readTree(response).path("records");
        List<MarketPriceRecord> prices = new java.util.ArrayList<>();
        if (rows.isArray()) {
            for (JsonNode row : rows) {
                prices.add(new MarketPriceRecord(
                        row.path("market").asText("Local market"),
                        row.path("commodity").asText(request.commodity()),
                        row.path("variety").asText("Other"),
                        row.path("arrival_date").asText("Latest available"),
                        parsePrice(row.path("min_price").asText()),
                        parsePrice(row.path("max_price").asText()),
                        parsePrice(row.path("modal_price").asText()),
                        "Rs/quintal"
                ));
            }
        }
        return prices;
    }

    private MarketPriceResponse estimatedMarketPrices(MarketPriceRequest request, String reason) {
        double modal = estimatedCommodityPrice(request.commodity(), request.stateName());
        List<MarketPriceRecord> records = List.of(new MarketPriceRecord(
                request.district() + " estimate",
                request.commodity(),
                "Common variety",
                "Estimate",
                round1(modal * 0.88),
                round1(modal * 1.15),
                modal,
                "Rs/quintal"
        ));
        return marketResponse(request, records, "Estimated fallback", "Live price unavailable: " + reason + ". Use mandi confirmation before selling.");
    }

    private MarketPriceResponse marketResponse(MarketPriceRequest request, List<MarketPriceRecord> records,
                                               String source, String note) {
        double average = round1(records.stream()
                .map(MarketPriceRecord::modalPrice)
                .filter(value -> value != null && value > 0)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0));
        String location = joinLocation(request.village(), request.district(), request.stateName());
        String trend = average >= 3000 ? "Strong price" : average >= 1800 ? "Moderate price" : "Low price";
        String advice = sellingAdvice(average, request.commodity(), source);
        return new MarketPriceResponse(
                location.isBlank() ? request.district() : location,
                request.commodity(),
                source,
                average,
                trend,
                advice,
                records,
                note
        );
    }

    private String sellingAdvice(double average, String commodity, String source) {
        if (source.startsWith("Estimated")) {
            return "This is an estimate. Call nearby mandi or check official market board before deciding sale.";
        }
        if (average <= 0) {
            return "Price is not available. Check another nearby district or market.";
        }
        String crop = safeLower(commodity);
        if (crop.contains("tomato") || crop.contains("onion") || crop.contains("vegetable")) {
            return "Vegetable prices change quickly. If quality is good and transport cost is low, compare 2-3 nearby markets before selling today.";
        }
        return "Compare modal price, transport cost, storage life, and nearby mandi prices. Sell in parts if price is uncertain.";
    }

    private double estimatedCommodityPrice(String commodity, String stateName) {
        String crop = safeLower(commodity);
        double price = 2200;
        if (crop.contains("paddy") || crop.contains("rice")) price = 2300;
        else if (crop.contains("wheat")) price = 2400;
        else if (crop.contains("maize")) price = 2100;
        else if (crop.contains("cotton")) price = 7200;
        else if (crop.contains("groundnut")) price = 6200;
        else if (crop.contains("turmeric")) price = 9500;
        else if (crop.contains("chilli")) price = 11000;
        else if (crop.contains("tomato")) price = 1800;
        else if (crop.contains("onion")) price = 1600;
        else if (crop.contains("banana")) price = 1500;
        String state = safeLower(stateName);
        if (state.contains("tamil nadu") || state.contains("kerala")) price *= 1.05;
        if (state.contains("rajasthan") || state.contains("madhya")) price *= 0.96;
        return round1(price);
    }

    private Double parsePrice(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Double.parseDouble(value.replace(",", "").trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    public SchemeResponse schemes(SchemeRequest request) {
        String crop = safeLower(request.cropName());
        String purpose = safeLower(request.purpose());
        String location = joinLocation(request.village(), request.district(), request.stateName());
        List<SchemeMatch> all = schemeCatalog(request);
        List<SchemeMatch> matches = all.stream()
                .filter(scheme -> schemeMatches(scheme, crop, purpose))
                .sorted(java.util.Comparator.comparing(SchemeMatch::priority))
                .limit(8)
                .toList();
        if (matches.isEmpty()) {
            matches = all.stream().limit(6).toList();
        }
        String summary = "Recommended schemes for " + blankDefault(request.cropName(), "your crop")
                + " in " + blankDefault(location, request.stateName())
                + ". Use official portal/bank/state agriculture office for final eligibility.";
        return new SchemeResponse(
                location.isBlank() ? request.stateName() : location,
                blankDefault(request.cropName(), "Any crop"),
                blankDefault(request.purpose(), "General farming support"),
                summary,
                matches,
                "Scheme rules, deadlines, and state portals can change. Verify on the official link or with the nearest agriculture office/bank before applying."
        );
    }

    private boolean schemeMatches(SchemeMatch scheme, String crop, String purpose) {
        String text = safeLower(scheme.name() + " " + scheme.category() + " " + scheme.suitableFor() + " " + scheme.benefit());
        if (purpose.isBlank() && crop.isBlank()) return true;
        boolean purposeMatch = purpose.isBlank() || text.contains(purpose)
                || (purpose.contains("loan") && text.contains("credit"))
                || (purpose.contains("insurance") && text.contains("bima"))
                || (purpose.contains("water") && (text.contains("irrigation") || text.contains("pump")))
                || (purpose.contains("subsidy") && text.contains("subsidy"));
        boolean cropMatch = crop.isBlank() || text.contains("any crop") || text.contains(crop)
                || (crop.contains("vegetable") && text.contains("horticulture"))
                || (crop.contains("fruit") && text.contains("horticulture"))
                || (crop.contains("paddy") && text.contains("food crop"))
                || (crop.contains("wheat") && text.contains("food crop"))
                || (crop.contains("cotton") && text.contains("commercial crop"));
        return purposeMatch && cropMatch;
    }

    private List<SchemeMatch> schemeCatalog(SchemeRequest request) {
        String state = blankDefault(request.stateName(), "India");
        return List.of(
                scheme("PM-KISAN Samman Nidhi", "Income support",
                        "Income support for eligible farmer families, paid directly to bank account.",
                        "Eligible landholding farmer families as per PM-KISAN rules.",
                        "Any crop, small and marginal farmers, general farming expense.",
                        "https://pmkisan.gov.in/",
                        state, "PM KISAN apply " + state,
                        "Aadhaar, land record, bank account, mobile number.", "1"),
                scheme("Kisan Credit Card (KCC)", "Loan / crop credit",
                        "Short-term crop loan and working capital through banks; useful for seed, fertilizer, labour, irrigation, and allied activities.",
                        "Farmers, tenant farmers, sharecroppers, SHGs/JLGs as per bank norms.",
                        "Loan purpose, any crop, dairy, fisheries, animal husbandry.",
                        "https://www.jansamarth.in/",
                        state, "Kisan Credit Card apply " + state,
                        "Aadhaar, land/lease details, bank KYC, crop details, photos.", "1"),
                scheme("Pradhan Mantri Fasal Bima Yojana (PMFBY)", "Crop insurance",
                        "Insurance cover for notified crops against yield loss from natural calamity, pests, disease, and weather risks.",
                        "Farmers growing notified crops in notified areas/seasons; enrollment is through portal, bank, CSC, or insurer.",
                        "Food crop, oilseed, commercial crop, horticulture crop, weather risk, crop loss.",
                        "https://pmfby.gov.in/",
                        state, "PMFBY crop insurance apply " + state,
                        "Land/crop sowing details, bank account, Aadhaar, premium payment details.", "2"),
                scheme("Agriculture Infrastructure Fund (AIF)", "Loan / infrastructure",
                        "Medium/long-term financing support for post-harvest infrastructure and community farming assets.",
                        "Farmers, FPOs, PACS, SHGs, agri entrepreneurs and eligible groups.",
                        "Warehouse, cold storage, grading, processing, pack house, value addition, market linkage.",
                        "https://agriinfra.dac.gov.in/",
                        state, "Agriculture Infrastructure Fund apply " + state,
                        "Project report, land/business documents, bank details, KYC, quotations.", "2"),
                scheme("PM-KUSUM", "Solar pump / irrigation subsidy",
                        "Support for solar pumps and solarization of agriculture pumps, implemented through state agencies.",
                        "Farmers and farmer groups as per state component and availability.",
                        "Irrigation, water pump, solar pump, electricity cost reduction.",
                        "https://pmkusum.mnre.gov.in/",
                        state, "PM KUSUM apply " + state,
                        "Land details, pump/electricity connection details, Aadhaar, bank account.", "3"),
                scheme("Soil Health Card", "Soil testing / fertilizer guidance",
                        "Soil testing and crop-wise nutrient recommendation to reduce fertilizer cost and improve yield.",
                        "Farmers submitting soil samples through state agriculture department/testing labs.",
                        "Any crop, fertilizer recommendation, soil nutrient analysis, pH, NPK.",
                        "https://soilhealth.dac.gov.in/",
                        state, "Soil Health Card apply " + state,
                        "Farmer details, land details, soil sample, mobile number.", "3"),
                scheme("National Horticulture Board / MIDH support", "Horticulture subsidy",
                        "Support for horticulture development, protected cultivation, pack house, cold chain, and related activities.",
                        "Horticulture farmers, entrepreneurs, FPOs and eligible applicants as per component.",
                        "Vegetables, fruits, flowers, spices, plantation crops, greenhouse, nursery, cold chain.",
                        "https://nhb.gov.in/",
                        state, "horticulture subsidy scheme apply " + state,
                        "Project details, land record, bank details, quotations, identity proof.", "4"),
                scheme("e-NAM", "Market linkage",
                        "Online national agriculture market for better price discovery through connected mandis.",
                        "Farmers/FPOs trading in e-NAM enabled mandis.",
                        "Any crop, market price, selling, mandi linkage.",
                        "https://www.enam.gov.in/",
                        state, "eNAM farmer registration " + state,
                        "Mobile number, bank account, mandi registration/KYC where required.", "5"),
                scheme(state + " State Agriculture Department Schemes", "State subsidy",
                        "State-specific subsidies for seeds, farm machinery, drip irrigation, crop support, and training.",
                        "Depends on state, district, crop, community category, and current notifications.",
                        "Any crop, local subsidy, district agriculture office, state farmer welfare scheme.",
                        "https://www.google.com/search?q=" + encodeUrl(state + " agriculture department farmer schemes official"),
                        state, state + " farmer scheme apply official",
                        "Aadhaar, land record, bank account, community/income certificate if required.", "6")
        );
    }

    private SchemeMatch scheme(String name, String category, String benefit, String eligibility, String suitableFor,
                               String applyLink, String state, String searchQuery, String documents, String priority) {
        return new SchemeMatch(name, category, benefit, eligibility, suitableFor, applyLink,
                "https://www.google.com/search?q=" + encodeUrl(searchQuery + " official"),
                documents, priority);
    }

    private String encodeUrl(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    public KnowledgeResponse knowledge(KnowledgeRequest request) {
        String crop = safeLower(request.cropName());
        String topic = safeLower(request.topic());
        String location = joinLocation(request.village(), request.district(), request.stateName());
        List<KnowledgeArticle> articles = knowledgeRepository().stream()
                .filter(article -> knowledgeMatches(article, crop, topic))
                .sorted(java.util.Comparator.comparing(KnowledgeArticle::priority))
                .limit(8)
                .toList();
        if (articles.isEmpty()) {
            articles = knowledgeRepository().stream().limit(8).toList();
        }
        List<String> tips = agriculturalTips(request);
        List<String> experts = expertRecommendations(request);
        String summary = "Knowledge recommendations for "
                + blankDefault(request.cropName(), "general farming")
                + " in " + blankDefault(location, "selected place")
                + ". Includes articles, practical tips, and expert-style recommendations.";
        return new KnowledgeResponse(
                location.isBlank() ? "selected place" : location,
                blankDefault(request.cropName(), "Any crop"),
                blankDefault(request.topic(), "General farming"),
                summary,
                articles,
                tips,
                experts,
                "This knowledge repository gives practical guidance. For pesticide dose, disease confirmation, and government rules, verify with local agriculture officer/KVK."
        );
    }

    private boolean knowledgeMatches(KnowledgeArticle article, String crop, String topic) {
        String text = safeLower(article.title() + " " + article.category() + " " + article.summary() + " " + article.recommendation());
        boolean cropMatch = crop.isBlank() || text.contains("any crop") || text.contains(crop)
                || (crop.contains("paddy") && text.contains("rice"))
                || (crop.contains("vegetable") && text.contains("vegetables"))
                || (crop.contains("fruit") && text.contains("horticulture"));
        boolean topicMatch = topic.isBlank() || text.contains(topic)
                || (topic.contains("disease") && text.contains("pest"))
                || ((topic.contains("water") || topic.contains("irrigation")) && (text.contains("irrigation") || text.contains("water")))
                || (topic.contains("fertilizer") && text.contains("nutrient"));
        return cropMatch && topicMatch;
    }

    private List<KnowledgeArticle> knowledgeRepository() {
        return List.of(
                article("Soil testing before crop planning", "Soil and nutrient management",
                        "A soil test helps identify pH, organic carbon, nitrogen, phosphorus, potassium, and micronutrient gaps.",
                        "Test soil before major season changes. Use soil-test based fertilizer instead of applying urea blindly.",
                        "Collect soil from 6-8 places in a field, mix, shade dry, and submit a representative sample.", "1"),
                article("Integrated pest management for any crop", "Pest and disease control",
                        "IPM combines resistant varieties, field sanitation, monitoring, traps, biological control, and need-based spraying.",
                        "Inspect the field weekly. Spray only after identifying the pest/disease and economic threshold.",
                        "Avoid repeated use of the same chemical group; rotate modes of action.", "1"),
                article("Paddy water and nutrient care", "Rice / paddy management",
                        "Paddy needs careful water depth, split nitrogen, and monitoring for blast, stem borer, and leaf folder.",
                        "Keep shallow water, avoid deep standing water after fertilizer, and split urea at tillering and panicle initiation.",
                        "If brown/diamond leaf spots appear, confirm blast locally before fungicide.", "2"),
                article("Vegetable crop protection", "Vegetables and horticulture",
                        "Tomato, chilli, brinjal, and gourds need staking, spacing, mulching, and regular pest scouting.",
                        "Use yellow/blue sticky traps, remove infected plants early, and avoid overhead irrigation in humid weather.",
                        "For fruiting vegetables, balance nitrogen with potassium to improve fruit quality.", "2"),
                article("Drip irrigation and mulching", "Water optimization",
                        "Drip irrigation and mulching reduce evaporation, weed growth, and fertilizer loss.",
                        "Use drip for vegetables, banana, sugarcane, cotton, and orchards where possible. Irrigate morning/evening.",
                        "Fertigation should be small and frequent; flush drip lines regularly.", "2"),
                article("Organic matter improvement", "Soil health",
                        "Compost, FYM, green manure, crop residue, and biofertilizers improve soil structure and microbial life.",
                        "Add organic matter before land preparation and avoid burning residues.",
                        "Sandy/red soils need organic matter more frequently because nutrients leach faster.", "3"),
                article("Seed selection and sowing", "Crop establishment",
                        "Good seed, correct sowing time, spacing, and seed treatment reduce disease and improve yield.",
                        "Use certified seed or quality saved seed. Treat seed with recommended bio/chemical treatment.",
                        "Do not sow too deep; maintain recommended spacing for airflow and sunlight.", "3"),
                article("Weather-based farm decisions", "Climate smart farming",
                        "Rain, humidity, wind, and temperature affect irrigation, spraying, disease risk, and harvesting.",
                        "Avoid pesticide/fertilizer spraying before rain or during high wind. Harvest dry produce when possible.",
                        "High humidity increases fungal disease risk; scout leaves after cloudy/rainy days.", "3"),
                article("Post-harvest handling and market readiness", "Market and storage",
                        "Cleaning, grading, drying, packing, and storage improve price and reduce losses.",
                        "Sell perishable produce quickly after comparing nearby mandi prices. Store grains only after proper drying.",
                        "Keep produce off the floor and use clean bags/crates to avoid contamination.", "4"),
                article("Farm records and cost control", "Farm management",
                        "Recording input cost, labour, irrigation, spray, yield, and sale price helps choose profitable crops.",
                        "Track expenses crop-wise and compare net profit, not only yield.",
                        "Use records to decide whether to store, sell, or change crop next season.", "4")
        );
    }

    private KnowledgeArticle article(String title, String category, String summary, String recommendation,
                                     String expertTip, String priority) {
        return new KnowledgeArticle(title, category, summary, recommendation, expertTip, priority);
    }

    private List<String> agriculturalTips(KnowledgeRequest request) {
        String soil = safeLower(request.soilType());
        String season = safeLower(request.season());
        List<String> tips = new java.util.ArrayList<>();
        tips.add("Check field twice a week for leaf color, pests, weeds, water stress, and disease spots.");
        tips.add("Use balanced fertilizer based on soil and crop stage; avoid excess urea.");
        if (soil.contains("sandy")) tips.add("Use mulch and split irrigation/fertilizer because sandy soil loses water and nutrients quickly.");
        if (soil.contains("clay") || soil.contains("black")) tips.add("Keep drainage channels open because heavy soil can hold too much water.");
        if (season.contains("monsoon") || season.contains("kharif")) tips.add("Avoid spraying just before rain and watch for fungal diseases.");
        if (season.contains("summer") || season.contains("zaid")) tips.add("Irrigate early morning/evening and use mulching to reduce heat stress.");
        tips.add("Keep records of seed, fertilizer, labour, irrigation, pesticide, yield, and selling price.");
        return tips;
    }

    private List<String> expertRecommendations(KnowledgeRequest request) {
        String crop = safeLower(request.cropName());
        List<String> experts = new java.util.ArrayList<>();
        experts.add("Visit the nearest KVK/agriculture office for crop-specific dose, disease confirmation, and local variety recommendation.");
        experts.add("Before applying pesticide, identify the exact pest/disease and follow the label dose and waiting period.");
        experts.add("Use crop rotation and field sanitation to reduce disease carryover.");
        if (crop.contains("paddy") || crop.contains("rice")) {
            experts.add("For paddy, maintain shallow water, split nitrogen, and monitor blast/stem borer during humid weather.");
        } else if (crop.contains("tomato") || crop.contains("chilli") || crop.contains("vegetable")) {
            experts.add("For vegetables, use staking, mulching, sticky traps, and balanced potassium during flowering/fruiting.");
        } else if (crop.contains("cotton")) {
            experts.add("For cotton, monitor sucking pests and bollworm; use traps and avoid unnecessary early sprays.");
        }
        return experts;
    }

    private List<String> weatherLocationQueries(WeatherRequest request) {
        List<String> queries = new java.util.ArrayList<>();
        String village = request.village();
        String district = request.district();
        String state = request.stateName();
        if (village != null && !village.isBlank()) {
            queries.add(joinLocation(village, district, state, "India"));
            queries.add(joinLocation(village, state, "India"));
        }
        queries.add(joinLocation(district, state, "India"));
        queries.add(joinLocation(district, "India"));
        queries.add(joinLocation(state, "India"));
        return queries.stream().filter(value -> value != null && !value.isBlank()).distinct().toList();
    }

    private String joinLocation(String... parts) {
        return java.util.Arrays.stream(parts)
                .filter(value -> value != null && !value.isBlank())
                .reduce((left, right) -> left + ", " + right)
                .orElse("");
    }

    private GeoPoint geocode(String query) throws IOException {
        String searchName = query.split(",")[0].trim();
        String encoded = URLEncoder.encode(searchName.isBlank() ? query : searchName, StandardCharsets.UTF_8);
        String response = restClient.get()
                .uri("https://geocoding-api.open-meteo.com/v1/search?name=" + encoded + "&count=10&language=en&format=json")
                .retrieve()
                .body(String.class);
        JsonNode results = objectMapper.readTree(response).path("results");
        JsonNode first = bestGeoResult(results, query);
        if (first.isMissingNode()) {
            throw new IllegalArgumentException("Location not found");
        }
        String name = first.path("name").asText(query);
        String admin1 = first.path("admin1").asText("");
        String country = first.path("country").asText("");
        return new GeoPoint(first.path("latitude").asDouble(), first.path("longitude").asDouble(),
                String.join(", ", java.util.stream.Stream.of(name, admin1, country).filter(v -> !v.isBlank()).toList()));
    }

    private JsonNode bestGeoResult(JsonNode results, String query) {
        if (!results.isArray() || results.isEmpty()) {
            return objectMapper.missingNode();
        }
        String lowerQuery = query.toLowerCase();
        for (JsonNode result : results) {
            String country = result.path("country").asText("").toLowerCase();
            String admin1 = result.path("admin1").asText("").toLowerCase();
            String admin2 = result.path("admin2").asText("").toLowerCase();
            boolean stateMatches = !admin1.isBlank() && lowerQuery.contains(admin1);
            boolean districtMatches = !admin2.isBlank() && lowerQuery.contains(admin2);
            if (country.equals("india") && (stateMatches || districtMatches)) {
                return result;
            }
        }
        for (JsonNode result : results) {
            if (result.path("country").asText("").equalsIgnoreCase("India")) {
                return result;
            }
        }
        return results.path(0);
    }

    private WeatherForecastResponse fetchOpenMeteoForecast(GeoPoint point, String originalQuery) throws IOException {
        String uri = "https://api.open-meteo.com/v1/forecast?latitude=" + point.latitude()
                + "&longitude=" + point.longitude()
                + "&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m"
                + "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration"
                + "&timezone=auto&forecast_days=7";
        JsonNode root = objectMapper.readTree(restClient.get().uri(uri).retrieve().body(String.class));
        JsonNode current = root.path("current");
        JsonNode daily = root.path("daily");
        List<DailyWeather> days = new java.util.ArrayList<>();
        for (int i = 0; i < daily.path("time").size(); i++) {
            int code = daily.path("weather_code").path(i).asInt();
            days.add(new DailyWeather(
                    daily.path("time").path(i).asText(),
                    weatherCode(code),
                    daily.path("temperature_2m_max").path(i).asDouble(),
                    daily.path("temperature_2m_min").path(i).asDouble(),
                    daily.path("precipitation_sum").path(i).asDouble(),
                    daily.path("precipitation_probability_max").path(i).isMissingNode() ? null : daily.path("precipitation_probability_max").path(i).asInt(),
                    daily.path("wind_speed_10m_max").path(i).asDouble(),
                    daily.path("et0_fao_evapotranspiration").path(i).asDouble()
            ));
        }
        double rain = current.path("precipitation").asDouble();
        int code = current.path("weather_code").asInt();
        Double temp = current.path("temperature_2m").asDouble();
        Integer humidity = current.path("relative_humidity_2m").asInt();
        Double wind = current.path("wind_speed_10m").asDouble();
        return new WeatherForecastResponse(
                point.label().isBlank() ? originalQuery : point.label(),
                "Open-Meteo live forecast",
                weatherCode(code),
                temp,
                humidity,
                wind,
                rain,
                weatherAdvisory(days, rain, humidity, wind),
                days
        );
    }

    private WeatherForecastResponse estimatedWeather(WeatherRequest request, String reason) {
        ClimateEstimate estimate = estimateClimate(request.stateName(), "kharif");
        String location = java.util.stream.Stream.of(request.village(), request.district(), request.stateName())
                .filter(value -> value != null && !value.isBlank())
                .reduce((left, right) -> left + ", " + right)
                .orElse("selected place");
        List<DailyWeather> days = java.util.stream.IntStream.rangeClosed(1, 7)
                .mapToObj(day -> new DailyWeather("Day " + day, estimate.climate(), estimate.temperature() + (day % 3),
                        estimate.temperature() - 6, estimate.rainfall() / 40, estimate.humidity() > 70 ? 60 : 25,
                        12.0 + day, 3.5))
                .toList();
        return new WeatherForecastResponse(location, "Estimated fallback",
                estimate.climate(), estimate.temperature(), (int) estimate.humidity(), 12.0, estimate.rainfall() / 40,
                "Live weather could not be loaded (" + reason + "). Use this estimate only for planning. Avoid pesticide spraying if rain is likely and check local forecast before irrigation.",
                days);
    }

    private String weatherAdvisory(List<DailyWeather> days, double currentRain, int humidity, double wind) {
        boolean rainSoon = days.stream().limit(3).anyMatch(day -> (day.rainChance() != null && day.rainChance() >= 60) || day.rainMm() >= 5);
        boolean highWind = wind >= 25 || days.stream().limit(3).anyMatch(day -> day.windKph() >= 30);
        boolean humid = humidity >= 75;
        List<String> advice = new java.util.ArrayList<>();
        if (rainSoon || currentRain > 0) advice.add("Rain is likely. Delay pesticide/fertilizer spraying and check drainage.");
        if (highWind) advice.add("Wind is high. Avoid spraying and protect young plants/support creepers.");
        if (humid) advice.add("Humidity is high. Scout for fungal disease on leaves.");
        if (advice.isEmpty()) advice.add("Weather looks manageable. Irrigate based on soil moisture and crop stage.");
        return String.join(" ", advice);
    }

    private String weatherCode(int code) {
        return switch (code) {
            case 0 -> "Clear sky";
            case 1, 2, 3 -> "Partly cloudy";
            case 45, 48 -> "Fog";
            case 51, 53, 55, 56, 57 -> "Drizzle";
            case 61, 63, 65, 66, 67 -> "Rain";
            case 71, 73, 75, 77 -> "Snow";
            case 80, 81, 82 -> "Rain showers";
            case 95, 96, 99 -> "Thunderstorm";
            default -> "Changing weather";
        };
    }

    private record GeoPoint(double latitude, double longitude, String label) {}
}
