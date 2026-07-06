package com.farmassist.api.repository;

import com.farmassist.api.entity.ManagedRecord;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ManagedRecordRepository extends JpaRepository<ManagedRecord, Long> {
    List<ManagedRecord> findByModuleOrderByUpdatedAtDesc(String module);
}
