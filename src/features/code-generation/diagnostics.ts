import type { Project } from "../program";

export function startupDiagnostics(p:Project){
 const start='    ros.info("Starting micro-ROS program");';
 // Refer to the configuration constants so local edits to credentials or node
 // names are reflected in the monitor. The password is never printed.
 const configuration=p.transport==="wifi"?[
  ['Node          : ','NODE_NAME'],['ROS_DOMAIN_ID : ','ROS_DOMAIN'],['Handles       : ','EXECUTOR_HANDLES'],
  ['SSID          : ','WIFI_SSID'],['Agent IP      : ','AGENT_IP'],['Agent port    : ','AGENT_PORT']
 ].map(([label,value])=>`    Serial.print("${label}"); Serial.println(${value});`).join("\n"):'    // The Serial port is reserved for the Agent binary protocol.';
 return `${start}\n${configuration}\n    ros.info("Configuring hardware...");`;
}
export const wifiMonitorDeclarations=`// Track connection changes without blocking controllers.
bool wifi_was_connected = true;
uint32_t wifi_last_warning_ms = 0;
const uint32_t WIFI_WARNING_PERIOD_MS = 1000;`;
export const wifiMonitorLoop=`    if (!ros.wifiConnected()) {
        const uint32_t now = millis();
        if (wifi_was_connected || static_cast<uint32_t>(now - wifi_last_warning_ms) >= WIFI_WARNING_PERIOD_MS) {
            ros.info("WiFi connection lost. Check the network and Agent.");
            wifi_last_warning_ms = now;
        }
        wifi_was_connected = false;
        delay(10);
        return;
    }
    if (!wifi_was_connected) {
        ros.info("WiFi connection restored. Resuming the executor.");
        wifi_was_connected = true;
    }
`;
