#include <Servo.h>

Servo myservo;

#define SERVO_PIN D4

void setup() {
  myservo.attach(SERVO_PIN);
}

void loop() {
  for(int pos = 0; pos <= 90 ;pos+=2) {
    myservo.write(pos);
    delay(10);
  }


  delay(500);

  for(int pos = 90; pos >= 0; pos-=2) {
    myservo.write(pos);
    delay(10);
  }
  delay(500);
}
