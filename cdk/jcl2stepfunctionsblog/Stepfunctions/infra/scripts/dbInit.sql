DROP TABLE IF EXISTS employee;

CREATE TABLE IF NOT EXISTS employee (
    employee_id VARCHAR(64) NOT NULL,
    birth_date DATE NOT NULL,
    first_name VARCHAR(64) NOT NULL,
    last_name   VARCHAR(64) NOT NULL,
    gender   CHAR(1),
    hire_date DATE NOT NULL,
    PRIMARY KEY(employee_id)
);

REPLACE INTO employee(employee_id, birth_date, first_name, last_name, gender, hire_date) values ("10001","1953-09-02","Georgi","Facello","M","1986-06-26");
REPLACE INTO employee(employee_id, birth_date, first_name, last_name, gender, hire_date) values ("10002","1964-06-02","Bezalel","Simmel","F","1985-11-21");