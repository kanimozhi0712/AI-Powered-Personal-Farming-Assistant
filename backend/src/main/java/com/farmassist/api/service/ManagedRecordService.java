package com.farmassist.api.service;

import com.farmassist.api.dto.RecordDtos.RecordRequest;
import com.farmassist.api.entity.ManagedRecord;
import com.farmassist.api.repository.ManagedRecordRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ManagedRecordService {
    private final ManagedRecordRepository records;

    public ManagedRecordService(ManagedRecordRepository records) {
        this.records = records;
    }

    public List<ManagedRecord> list(String module) {
        return records.findByModuleOrderByUpdatedAtDesc(module);
    }

    public ManagedRecord create(String module, RecordRequest request) {
        ManagedRecord record = new ManagedRecord();
        record.setModule(module);
        copy(request, record);
        return records.save(record);
    }

    public ManagedRecord update(Long id, RecordRequest request) {
        ManagedRecord record = records.findById(id).orElseThrow(() -> new IllegalArgumentException("Record not found"));
        copy(request, record);
        return records.save(record);
    }

    public void delete(Long id) {
        records.deleteById(id);
    }

    private void copy(RecordRequest request, ManagedRecord record) {
        record.setTitle(request.title());
        record.setContent(request.content());
        record.setMetadataJson(request.metadataJson());
        record.setOwnerId(request.ownerId());
    }
}
