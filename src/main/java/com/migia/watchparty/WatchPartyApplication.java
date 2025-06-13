package com.migia.watchparty;

import com.migia.watchparty.service.StorageProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@EnableConfigurationProperties(StorageProperties.class)
@SpringBootApplication
public class WatchPartyApplication {

	public static void main(String[] args) {
		SpringApplication.run(WatchPartyApplication.class, args);
	}

}
