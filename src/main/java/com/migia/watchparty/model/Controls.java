package com.migia.watchparty.model;

public record Controls (ControlType controls, double value ){
    enum ControlType{
PAUSE,
        PLAY,
        FORWARD,
        SEEK,
        STOP,

}
}
