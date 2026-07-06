package com.farmassist.api.controller;

import com.farmassist.api.dto.RecordDtos.*;
import com.farmassist.api.entity.ManagedRecord;
import com.farmassist.api.service.AgricultureIntelligenceService;
import com.farmassist.api.service.ManagedRecordService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class ModuleController {
    private final ManagedRecordService records;
    private final AgricultureIntelligenceService ai;

    public ModuleController(ManagedRecordService records, AgricultureIntelligenceService ai) {
        this.records = records;
        this.ai = ai;
    }

    @PostMapping("/ai/chat")
    public AiChatResponse chat(@Valid @RequestBody AiChatRequest request) {
        return ai.chat(request);
    }

    @PostMapping("/crops/recommend")
    public Map<String, String> recommendCrop(@RequestBody CropRecommendationRequest request) {
        return Map.of("recommendation", ai.cropRecommendation(request));
    }

    @PostMapping("/weather/forecast")
    public WeatherForecastResponse weather(@Valid @RequestBody WeatherRequest request) {
        return ai.weather(request);
    }

    @PostMapping("/irrigation/predict")
    public IrrigationResponse irrigation(@Valid @RequestBody IrrigationRequest request) {
        return ai.irrigation(request);
    }

    @PostMapping("/fertilizer/recommend")
    public FertilizerResponse fertilizer(@Valid @RequestBody FertilizerRequest request) {
        return ai.fertilizer(request);
    }

    @PostMapping("/market/prices")
    public MarketPriceResponse marketPrices(@Valid @RequestBody MarketPriceRequest request) {
        return ai.marketPrices(request);
    }

    @PostMapping("/schemes/recommend")
    public SchemeResponse schemes(@Valid @RequestBody SchemeRequest request) {
        return ai.schemes(request);
    }

    @PostMapping("/knowledge/recommend")
    public KnowledgeResponse knowledge(@RequestBody KnowledgeRequest request) {
        return ai.knowledge(request);
    }

    @PostMapping("/disease/detect")
    public DiseaseDetectionResponse detectDisease(@RequestParam("image") MultipartFile image,
                                                  @RequestParam(value = "cropName", required = false) String cropName,
                                                  @RequestParam(value = "symptoms", required = false) String symptoms) {
        return ai.detectDisease(image, cropName, symptoms);
    }

    @GetMapping("/{module}")
    public List<ManagedRecord> list(@PathVariable String module) {
        return records.list(module);
    }

    @PostMapping("/{module}")
    public ManagedRecord create(@PathVariable String module, @Valid @RequestBody RecordRequest request) {
        return records.create(module, request);
    }

    @PutMapping("/{module}/{id}")
    public ManagedRecord update(@PathVariable String module, @PathVariable Long id, @Valid @RequestBody RecordRequest request) {
        return records.update(id, request);
    }

    @DeleteMapping("/{module}/{id}")
    public void delete(@PathVariable String module, @PathVariable Long id) {
        records.delete(id);
    }
}
