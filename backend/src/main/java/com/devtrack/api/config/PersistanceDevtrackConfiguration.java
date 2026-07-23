package com.devtrack.api.config;

import java.util.HashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

@Configuration
@EnableJpaRepositories(
		basePackages = {"com.devtrack.api.repository", "com.devtrack.api.notification.repository"}, 
		entityManagerFactoryRef = "devtrackEntityManager",
		transactionManagerRef = "devtrackTransactionManager")
public class PersistanceDevtrackConfiguration {

	@Value("${spring.devtrack-datasource.show-sql:false}")
	private String showsql;
	@Value("${spring.devtrack-datasource.hibernate.dialect:org.hibernate.dialect.MySQLDialect}")
	private String dialect;
	@Value("${spring.devtrack-datasource.hibernate.ddl-auto:none}")
	private String hbm2ddl;
	@Value("${spring.devtrack-datasource.maximumPoolSize:30}")
	private String maximumPoolSize;
	@Value("${spring.devtrack-datasource.poolName:DevTrackHikariPool}")
	private String poolName;
	@Value("${spring.devtrack-datasource.idleTimeout:600000}")
	private String idleTimeout;
	@Value("${spring.devtrack-datasource.leakDetectionThreshold:0}")
	private String leakDetectionThreshold;
	@Value("${spring.devtrack-datasource.maxLifetime:1800000}")
	private String maxLifetime;
	@Value("${spring.devtrack-datasource.minimumIdle:2}")
	private String minimumIdle;
	@Value("${spring.devtrack-datasource.readOnly:false}")
	private String readOnly;
	@Value("${spring.devtrack-datasource.schema:}")
	private String schema;
	@Value("${spring.devtrack-datasource.transactionIsolation:}")
	private String transactionIsolation;
	@Value("${spring.devtrack-datasource.validationTimeout:5000}")
	private String validationTimeout;
	@Value("${spring.devtrack-datasource.connectionInitSql:}")
	private String connectionInitSql;
	@Value("${spring.devtrack-datasource.initializationFailTimeout:1}")
	private String initializationFailTimeout;


	@Bean
	@Primary
	HikariDataSource devtrackDataSource() {
		DataSourceProperties dataSourceProperties = devtrackDataSourceProperties();
		HikariConfig hikariConfig = new HikariConfig();
		hikariConfig.setDriverClassName(dataSourceProperties.getDriverClassName());
		hikariConfig.setJdbcUrl(dataSourceProperties.getUrl());
		hikariConfig.setUsername(dataSourceProperties.getUsername());
		hikariConfig.setPassword(dataSourceProperties.getPassword());
		if (maximumPoolSize != null && !maximumPoolSize.isEmpty())
			hikariConfig.setMaximumPoolSize(Integer.parseInt(maximumPoolSize));

		hikariConfig.setConnectionTestQuery("SELECT 1 FROM DUAL");

		if (poolName != null && !poolName.isEmpty())
			hikariConfig.setPoolName(poolName);
		if (idleTimeout != null && !idleTimeout.isEmpty())
			hikariConfig.setIdleTimeout(Integer.parseInt(idleTimeout));
		if (leakDetectionThreshold != null && !leakDetectionThreshold.isEmpty())
			hikariConfig.setLeakDetectionThreshold(Integer.parseInt(leakDetectionThreshold));
		if (maxLifetime != null && !maxLifetime.isEmpty())
			hikariConfig.setMaxLifetime(Integer.parseInt(maxLifetime));
		if (minimumIdle != null && !minimumIdle.isEmpty())
			hikariConfig.setMinimumIdle(Integer.parseInt(minimumIdle));
		if ("true".equalsIgnoreCase(readOnly))
			hikariConfig.setReadOnly(true);
		if ("false".equalsIgnoreCase(readOnly))
			hikariConfig.setReadOnly(false);
		if (schema != null && !schema.isEmpty())
			hikariConfig.setSchema(schema);
		if (transactionIsolation != null && !transactionIsolation.isEmpty())
			hikariConfig.setTransactionIsolation(transactionIsolation);
		if (validationTimeout != null && !validationTimeout.isEmpty())
			hikariConfig.setValidationTimeout(Integer.parseInt(validationTimeout));
		if (connectionInitSql != null && !connectionInitSql.isEmpty())
			hikariConfig.setConnectionInitSql(connectionInitSql);
		if (initializationFailTimeout != null && !initializationFailTimeout.isEmpty())
			hikariConfig.setInitializationFailTimeout(Integer.parseInt(initializationFailTimeout));

		return new HikariDataSource(hikariConfig);
	}

	@Bean
	@Primary
	@ConfigurationProperties(prefix = "spring.devtrack-datasource")
	DataSourceProperties devtrackDataSourceProperties() {
		return new DataSourceProperties();
	}


	@Bean
	@Primary
	PlatformTransactionManager devtrackTransactionManager() {
		JpaTransactionManager transactionManager = new JpaTransactionManager();
		transactionManager.setEntityManagerFactory(devtrackEntityManager().getObject());
		return transactionManager;
	}

	@Bean
	@Primary
	LocalContainerEntityManagerFactoryBean devtrackEntityManager() {
		LocalContainerEntityManagerFactoryBean em = new LocalContainerEntityManagerFactoryBean();
		em.setDataSource(devtrackDataSource());
		em.setPackagesToScan("com.devtrack.api.model", "com.devtrack.api.notification.model", "com.devtrack.api.model.achievement");
		HibernateJpaVendorAdapter vendorAdapter = new HibernateJpaVendorAdapter();
		HashMap<String, Object> properties = new HashMap<>();
		properties.put("hibernate.show-sql", showsql);
		properties.put("hibernate.dialect", dialect);
		properties.put("hibernate.default_catalog", schema);
		if (hbm2ddl != null && !hbm2ddl.isEmpty()) {
			properties.put("hibernate.hbm2ddl.auto", hbm2ddl);
		}
		em.setJpaPropertyMap(properties);
		em.setJpaVendorAdapter(vendorAdapter);
		return em;
	}


}
