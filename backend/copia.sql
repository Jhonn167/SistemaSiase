-- MySQL dump 10.13  Distrib 8.0.44, for macos15 (arm64)
--
-- Host: localhost    Database: proyecto_escuela
-- ------------------------------------------------------
-- Server version	9.3.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `Alumnos`
--

DROP TABLE IF EXISTS `Alumnos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Alumnos` (
  `ID_Alumno` int NOT NULL AUTO_INCREMENT,
  `Matricula` varchar(20) NOT NULL,
  `ID_Usuario` int NOT NULL,
  `NombreCompleto` varchar(255) NOT NULL,
  `Carrera` varchar(100) DEFAULT NULL,
  `CreditosMaximos` int DEFAULT '30',
  PRIMARY KEY (`ID_Alumno`),
  UNIQUE KEY `Matricula` (`Matricula`),
  UNIQUE KEY `ID_Usuario` (`ID_Usuario`),
  CONSTRAINT `alumnos_ibfk_1` FOREIGN KEY (`ID_Usuario`) REFERENCES `Usuarios` (`ID_Usuario`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Alumnos`
--

LOCK TABLES `Alumnos` WRITE;
/*!40000 ALTER TABLE `Alumnos` DISABLE KEYS */;
INSERT INTO `Alumnos` VALUES (1,'1801234',1,'Ana Sofía Garza','IAS',30),(2,'1818181',3,'Pablo Gomez','ITS',30),(4,'12231',9,'usuario borrable','IAS',30);
/*!40000 ALTER TABLE `Alumnos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Calificaciones`
--

DROP TABLE IF EXISTS `Calificaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Calificaciones` (
  `ID_Calificacion` int NOT NULL AUTO_INCREMENT,
  `ID_Inscripcion` int NOT NULL,
  `CalificacionFinal` decimal(5,2) DEFAULT NULL,
  `Estatus` varchar(20) DEFAULT NULL COMMENT 'Ej: Aprobado, Reprobado, Cursando',
  PRIMARY KEY (`ID_Calificacion`),
  UNIQUE KEY `ID_Inscripcion` (`ID_Inscripcion`),
  CONSTRAINT `calificaciones_ibfk_1` FOREIGN KEY (`ID_Inscripcion`) REFERENCES `Inscripciones` (`ID_Inscripcion`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Calificaciones`
--

LOCK TABLES `Calificaciones` WRITE;
/*!40000 ALTER TABLE `Calificaciones` DISABLE KEYS */;
INSERT INTO `Calificaciones` VALUES (1,6,90.00,'Aprobado'),(2,2,1.00,'Reprobado');
/*!40000 ALTER TABLE `Calificaciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Grupos`
--

DROP TABLE IF EXISTS `Grupos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Grupos` (
  `ID_Grupo` int NOT NULL AUTO_INCREMENT,
  `ID_Materia` int NOT NULL,
  `ID_Profesor` int NOT NULL,
  `ID_Periodo` int NOT NULL,
  `ClaveGrupo` varchar(10) NOT NULL COMMENT 'Ej: 001, 002',
  `CupoMaximo` int NOT NULL,
  `Aula` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`ID_Grupo`),
  KEY `ID_Materia` (`ID_Materia`),
  KEY `ID_Profesor` (`ID_Profesor`),
  KEY `ID_Periodo` (`ID_Periodo`),
  CONSTRAINT `grupos_ibfk_1` FOREIGN KEY (`ID_Materia`) REFERENCES `Materias` (`ID_Materia`),
  CONSTRAINT `grupos_ibfk_2` FOREIGN KEY (`ID_Profesor`) REFERENCES `Profesores` (`ID_Profesor`),
  CONSTRAINT `grupos_ibfk_3` FOREIGN KEY (`ID_Periodo`) REFERENCES `Periodos_Escolares` (`ID_Periodo`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Grupos`
--

LOCK TABLES `Grupos` WRITE;
/*!40000 ALTER TABLE `Grupos` DISABLE KEYS */;
INSERT INTO `Grupos` VALUES (1,1,1,1,'001',30,'A205'),(2,3,1,1,'001',25,'A408'),(3,5,3,1,'139',241,'13'),(4,5,3,1,'142',1,'214'),(5,6,3,1,'139',14,'10');
/*!40000 ALTER TABLE `Grupos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Horarios`
--

DROP TABLE IF EXISTS `Horarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Horarios` (
  `ID_Horario` int NOT NULL AUTO_INCREMENT,
  `ID_Grupo` int NOT NULL,
  `DiaSemana` int NOT NULL COMMENT '1=Lunes, 2=Martes...',
  `Hora_Inicio` time NOT NULL,
  `Hora_Fin` time NOT NULL,
  PRIMARY KEY (`ID_Horario`),
  KEY `ID_Grupo` (`ID_Grupo`),
  CONSTRAINT `horarios_ibfk_1` FOREIGN KEY (`ID_Grupo`) REFERENCES `Grupos` (`ID_Grupo`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Horarios`
--

LOCK TABLES `Horarios` WRITE;
/*!40000 ALTER TABLE `Horarios` DISABLE KEYS */;
INSERT INTO `Horarios` VALUES (1,1,1,'07:00:00','08:30:00'),(2,1,3,'07:00:00','08:30:00'),(3,2,2,'09:00:00','10:30:00'),(4,2,4,'09:00:00','10:30:00'),(5,3,1,'11:22:00','00:40:00'),(6,4,1,'00:12:00','14:10:00'),(7,4,2,'00:12:00','14:10:00'),(8,4,3,'00:12:00','14:10:00'),(9,4,4,'00:12:00','14:10:00'),(10,4,5,'00:12:00','14:10:00'),(11,5,1,'07:00:00','08:50:00'),(12,5,3,'07:00:00','08:50:00');
/*!40000 ALTER TABLE `Horarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Inscripciones`
--

DROP TABLE IF EXISTS `Inscripciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Inscripciones` (
  `ID_Inscripcion` int NOT NULL AUTO_INCREMENT,
  `ID_Alumno` int NOT NULL,
  `ID_Grupo` int NOT NULL,
  `FechaInscripcion` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_Inscripcion`),
  UNIQUE KEY `UQ_Inscripcion` (`ID_Alumno`,`ID_Grupo`),
  KEY `ID_Grupo` (`ID_Grupo`),
  CONSTRAINT `inscripciones_ibfk_1` FOREIGN KEY (`ID_Alumno`) REFERENCES `Alumnos` (`ID_Alumno`),
  CONSTRAINT `inscripciones_ibfk_2` FOREIGN KEY (`ID_Grupo`) REFERENCES `Grupos` (`ID_Grupo`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Inscripciones`
--

LOCK TABLES `Inscripciones` WRITE;
/*!40000 ALTER TABLE `Inscripciones` DISABLE KEYS */;
INSERT INTO `Inscripciones` VALUES (2,2,1,'2025-11-09 15:54:52'),(5,1,2,'2025-11-09 17:46:24'),(6,1,5,'2025-11-09 17:49:20');
/*!40000 ALTER TABLE `Inscripciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Materias`
--

DROP TABLE IF EXISTS `Materias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Materias` (
  `ID_Materia` int NOT NULL AUTO_INCREMENT,
  `ClaveMateria` varchar(20) NOT NULL,
  `Nombre` varchar(255) NOT NULL,
  `Creditos` int NOT NULL,
  PRIMARY KEY (`ID_Materia`),
  UNIQUE KEY `ClaveMateria` (`ClaveMateria`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Materias`
--

LOCK TABLES `Materias` WRITE;
/*!40000 ALTER TABLE `Materias` DISABLE KEYS */;
INSERT INTO `Materias` VALUES (1,'1401','Bases de Datos',6),(2,'1502','Programación Web',6),(3,'1803','Sistemas Operativos',6),(5,'2910','Matematicas 1',4),(6,'103','Fisica 4',2);
/*!40000 ALTER TABLE `Materias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Periodos_Escolares`
--

DROP TABLE IF EXISTS `Periodos_Escolares`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Periodos_Escolares` (
  `ID_Periodo` int NOT NULL AUTO_INCREMENT,
  `Nombre` varchar(100) NOT NULL,
  `Fecha_Inicio` date NOT NULL,
  `Fecha_Fin` date NOT NULL,
  `Estatus` varchar(20) NOT NULL COMMENT 'Ej: Activo, Cerrado, Futuro',
  PRIMARY KEY (`ID_Periodo`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Periodos_Escolares`
--

LOCK TABLES `Periodos_Escolares` WRITE;
/*!40000 ALTER TABLE `Periodos_Escolares` DISABLE KEYS */;
INSERT INTO `Periodos_Escolares` VALUES (1,'Otoño 2025','2025-08-01','2025-12-15','Activo');
/*!40000 ALTER TABLE `Periodos_Escolares` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Profesores`
--

DROP TABLE IF EXISTS `Profesores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Profesores` (
  `ID_Profesor` int NOT NULL AUTO_INCREMENT,
  `ID_Usuario` int NOT NULL,
  `NombreCompleto` varchar(255) NOT NULL,
  `CedulaProfesional` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`ID_Profesor`),
  UNIQUE KEY `ID_Usuario` (`ID_Usuario`),
  CONSTRAINT `profesores_ibfk_1` FOREIGN KEY (`ID_Usuario`) REFERENCES `Usuarios` (`ID_Usuario`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Profesores`
--

LOCK TABLES `Profesores` WRITE;
/*!40000 ALTER TABLE `Profesores` DISABLE KEYS */;
INSERT INTO `Profesores` VALUES (1,2,'Dr. Roberto Morales','12345678'),(3,8,'Profesor de pruebas','131414'),(4,10,'Profesor de pruebas2','13523');
/*!40000 ALTER TABLE `Profesores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Usuarios`
--

DROP TABLE IF EXISTS `Usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Usuarios` (
  `ID_Usuario` int NOT NULL AUTO_INCREMENT,
  `Email` varchar(255) NOT NULL,
  `PasswordHash` varchar(255) NOT NULL,
  `Rol` varchar(20) NOT NULL COMMENT 'Ej: Admin, Alumno, Profesor',
  PRIMARY KEY (`ID_Usuario`),
  UNIQUE KEY `Email` (`Email`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Usuarios`
--

LOCK TABLES `Usuarios` WRITE;
/*!40000 ALTER TABLE `Usuarios` DISABLE KEYS */;
INSERT INTO `Usuarios` VALUES (1,'1801234@uanl.edu.mx','hash_del_password_123','Alumno'),(2,'profe.morales@uanl.edu.mx','hash_del_password_abc','Profesor'),(3,'1818181@uanl.edu.mx','hash_del_password_abc','Alumno'),(8,'maestro@uanl.edu.mx','1234','Profesor'),(9,'1314@uanl.edu.mx','hash_del_password_123','Alumno'),(10,'13114@uanl.edu.mx','hash_del_password_123','Profesor');
/*!40000 ALTER TABLE `Usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'proyecto_escuela'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-11-09 20:54:38
