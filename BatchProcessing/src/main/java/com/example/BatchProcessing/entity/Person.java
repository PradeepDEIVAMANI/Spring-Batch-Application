package com.example.BatchProcessing.entity;


import jakarta.persistence.*;
import lombok.*;

@Entity
@Data
@Getter
@Setter
@NoArgsConstructor



public class Person {

        @Id
        private Long Index;

        private String UserId;

        private String FirstName;

        private String LastName;

        private String Sex;

        private String Email;

        private String Phone;

        private String Date_of_birth;

        private String JobTitle;

        public void setDateOfBirth(String dateOfBirth) {
        }
}
