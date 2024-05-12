Feature: Batch Extraction

  Scenario: Batch extraction with multiple users
    Given the following users
      | Index | User Id       | First Name | Last Name | Sex    | Email                   | Phone               | Date of birth | Job Title                           |
      | 1     | 88F7B33d2bcf9f5 | Shelby     | Terrell   | Male   | elijah57@example.net   | 001-084-906-7849x73518 | 1945-10-26     | Games developer                     |
      | 2     | f90cD3E76f1A9b9 | Phillip    | Summers   | Female | bethany14@example.com  | 214.112.6044x4913   | 1910-03-24     | Phytotherapist                      |
      | ...   | ...             | ...        | ...       | ...    | ...                     | ...                 | ...            | ...                                 |
      | 100   | b8D0aD3490FC7e1 | Mariah     | Bernard   | Male   | pcopeland@example.org  | (341)594-6554x44657 | 2016-11-15     | IT sales professional               |

    When I load the users into the database
    And I execute the extraction job
    Then my output file contains the following lines
      | 1,Shelby,Terrell  |
      | 2,Phillip,Summers |
      | ...               |
      | 100,Mariah,Bernard |
