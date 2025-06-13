package com.migia.watchparty.controller;


import com.migia.watchparty.model.Controls;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Slf4j
@Controller
public class WebsocketController {

@MessageMapping("/control")
@SendTo("/control")
public Controls handleControl( Controls control) {

    log.info(control.toString());
//return "Message Recieved";
    return new Controls(control.controls(), control.value());
}
}