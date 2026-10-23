#pragma once
// Minimal host-only API doubles. These check generated C++ syntax, not SDK compatibility.
#include <cstdint>
#include <cstddef>
#ifdef TEST_CAPTURE_LOGS
#include <string>
#include <vector>
inline std::vector<std::string> test_info_messages;
#endif
inline uint32_t test_clock_ms = 100;
inline bool test_wifi_connected = true;
inline unsigned test_spin_calls = 0, test_serial_text_calls = 0, test_max_delay_ms = 0;
#define HIGH 1
#define LOW 0
#define OUTPUT 1
#define INPUT 0
#define INPUT_PULLUP 2
#define CHANGE 3
#define IRAM_ATTR
#define PI 3.14159265358979323846
#define portMUX_INITIALIZER_UNLOCKED 0
#define ROSIDL_GET_MSG_TYPE_SUPPORT(package, category, name) nullptr
#define constrain(x, a, b) ((x) < (a) ? (a) : ((x) > (b) ? (b) : (x)))
using portMUX_TYPE = int;
inline void portENTER_CRITICAL_ISR(int*) {}
inline void portEXIT_CRITICAL_ISR(int*) {}
inline void portENTER_CRITICAL(int*) {}
inline void portEXIT_CRITICAL(int*) {}
inline void pinMode(int,int) {}
inline void digitalWrite(int,int) {}
inline bool digitalRead(int) { return false; }
inline uint32_t millis() { return test_clock_ms; }
inline void delay(int ms) { if(static_cast<unsigned>(ms)>test_max_delay_ms)test_max_delay_ms=ms; }
inline void delayMicroseconds(int) {}
inline void ledcWrite(int,uint32_t) {}
inline uint32_t ledcSetup(int,int,int) { return 1000; }
inline void ledcAttachPin(int,int) {}
inline int digitalPinToInterrupt(int x) { return x; }
inline void attachInterrupt(int, void(*)(), int) {}
struct SerialStub { void begin(int) {} template<class T> void print(const T&) {++test_serial_text_calls;} template<class T> void println(const T&) {++test_serial_text_calls;} };
inline SerialStub Serial;
struct IPAddress { IPAddress(int,int,int,int) {} };
struct rcl_publisher_t {};
struct rcl_subscription_t {};
struct rcl_timer_t {};
struct std_msgs__msg__Int32 { int32_t data = 0; };
struct std_msgs__msg__Float32 { float data = 0; };
struct std_msgs__msg__Bool { bool data = false; };
struct geometry_msgs__msg__Vector3 { double x = 0, y = 0, z = 0; };
struct geometry_msgs__msg__Twist { geometry_msgs__msg__Vector3 linear, angular; };
struct MicroROSHelper {
 template<class... T> bool beginWiFi(T...) { return true; }
 template<class... T> bool beginSerial(T...) { return true; }
 template<class... T> bool createPublisher(T...) { return true; }
 template<class... T> bool createSubscription(T...) { return true; }
 template<class... T> bool createTimer(T...) { return true; }
 template<class... T> bool publish(T...) { return true; }
 void require(bool,const char*) {}
 void info(const char* message) {
#if defined(TEST_CAPTURE_LOGS) && defined(MICRO_ROS_TRANSPORT_ARDUINO_WIFI)
 test_info_messages.emplace_back(message);
#endif
 }
 bool wifiConnected() { return test_wifi_connected; }
 bool spinSome(int) { ++test_spin_calls; return true; }
};
struct WireStub { void begin(int,int,int) {} };
inline WireStub Wire;
struct QuaternionStub { double x() const {return 0;} double y() const {return 0;} double z() const {return 0;} double w() const {return 1;} };
struct Adafruit_BNO055 { Adafruit_BNO055(int,int,void* = nullptr) {} bool begin() {return true;} void setExtCrystalUse(bool) {} QuaternionStub getQuat() {return {};} };
struct VL53L0X_RangingMeasurementData_t { int RangeStatus = 0, RangeMilliMeter = 0; };
struct Adafruit_VL53L0X { bool begin(int) {return true;} void rangingTest(VL53L0X_RangingMeasurementData_t*,bool) {} };

inline void analogReadResolution(int) {}
inline int analogRead(int) { return 2048; }
inline unsigned long pulseIn(int,int,unsigned long) { return 1000; }
#define MPU6050_RANGE_8_G 0
#define MPU6050_BAND_21_HZ 0
#define DHT11 11
#define SSD1306_SWITCHCAPVCC 2
#define SSD1306_WHITE 1
#define SH110X_WHITE 1
struct sensors_event_t { struct {float x=0,y=0,z=0;} acceleration; };
struct Adafruit_MPU6050 { bool begin(int,void*) {return true;} void setAccelerometerRange(int) {} void setFilterBandwidth(int) {} void getEvent(sensors_event_t*,sensors_event_t*,sensors_event_t*) {} };
struct DHT { DHT(int,int) {} void begin() {} float readTemperature(){return 20;} float readHumidity(){return 50;} };
struct DisplayStub { template<class... T> DisplayStub(T...) {} template<class... T> bool begin(T...){return true;} void clearDisplay() {} void setTextSize(int) {} void setTextColor(int) {} void setCursor(int,int) {} void display() {} void print(int) {} };
using Adafruit_SSD1306 = DisplayStub;
using Adafruit_SH1106G = DisplayStub;
struct TM1637Display { TM1637Display(int,int) {} void setBrightness(int) {} void showNumberDec(int) {} };

#define ADC_11db 3
inline uint32_t touchRead(int) {return 30;}
inline float temperatureRead() {return 42;}
inline uint32_t analogReadMilliVolts(int) {return 250;}
inline void analogSetPinAttenuation(int,int) {}
struct LiquidCrystal_PCF8574 { LiquidCrystal_PCF8574(int){} template<class... T> void begin(T...){} void setBacklight(int){} void clear(){} void setCursor(int,int){} template<class T> void print(T){} };
struct MD_MAX72XX { enum {FC16_HW=0,INTENSITY=1}; MD_MAX72XX(int,int,int,int,int){} bool begin(){return true;} void control(int,int){} void clear(){} void setRow(int,int,uint8_t){} };
struct AccelStepper { enum {HALF4WIRE=8}; AccelStepper(int,int,int,int,int){} void setMaxSpeed(float){} void setAcceleration(float){} void setCurrentPosition(long){} void disableOutputs(){} void enableOutputs(){} void moveTo(long){} void run(){} long distanceToGo(){return 0;} };
