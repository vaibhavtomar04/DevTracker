package com.devtrack.api.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "task_types")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class TaskType {
	
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    private String description;

    //public TaskType() {}

    public TaskType(String name, String description) {
        this.name = name;
        this.description = description;
    }

//    public Long getId() { return id; }
//    public void setId(Long id) { this.id = id; }
//
//    public String getName() { return name; }
//    public void setName(String name) { this.name = name; }
//
//    public String getDescription() { return description; }
//    public void setDescription(String description) { this.description = description; }
}
