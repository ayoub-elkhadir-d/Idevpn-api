CREATE TABLE carriers (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  name VARCHAR(700) NOT NULL,
  country_code CHAR(2) CHARACTER SET ascii COLLATE ascii_bin NOT NULL
    CHECK (country_code REGEXP '^[A-Z]{2}$'),
  country_name TEXT NOT NULL,
  logo_url VARCHAR(2048),
  status VARCHAR(16) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY carriers_name_country_unique (name, country_code),
  INDEX carriers_country_idx (country_code),
  INDEX carriers_status_idx (status)
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE servers (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  name VARCHAR(700) NOT NULL,
  hostname VARCHAR(253) NOT NULL,
  country_code CHAR(2) CHARACTER SET ascii COLLATE ascii_bin NOT NULL
    CHECK (country_code REGEXP '^[A-Z]{2}$'),
  country_name TEXT NOT NULL,
  carrier_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
  status VARCHAR(16) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'maintenance', 'offline')),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY servers_name_country_unique (name, country_code),
  INDEX servers_country_idx (country_code),
  INDEX servers_carrier_idx (carrier_id),
  INDEX servers_status_idx (status),
  CONSTRAINT servers_carrier_fk
    FOREIGN KEY (carrier_id) REFERENCES carriers(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE configurations (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  protocol VARCHAR(16) NOT NULL
    CHECK (protocol IN ('vless', 'vmess', 'trojan', 'shadowsocks', 'wireguard', 'hysteria2')),
  country_code CHAR(2) CHARACTER SET ascii COLLATE ascii_bin NOT NULL
    CHECK (country_code REGEXP '^[A-Z]{2}$'),
  country_name TEXT NOT NULL,
  carrier_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  server_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  description VARCHAR(2000) NOT NULL DEFAULT '',
  status VARCHAR(16) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'disabled')),
  protocol_data_encrypted JSON NOT NULL,
  created_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
  updated_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX configurations_name_search_idx (name),
  INDEX configurations_protocol_idx (protocol),
  INDEX configurations_country_idx (country_code),
  INDEX configurations_carrier_idx (carrier_id),
  INDEX configurations_server_idx (server_id),
  INDEX configurations_status_idx (status),
  INDEX configurations_created_at_idx (created_at),
  CONSTRAINT configurations_carrier_fk
    FOREIGN KEY (carrier_id) REFERENCES carriers(id) ON DELETE RESTRICT,
  CONSTRAINT configurations_server_fk
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE RESTRICT,
  CONSTRAINT configurations_created_by_fk
    FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL,
  CONSTRAINT configurations_updated_by_fk
    FOREIGN KEY (updated_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
