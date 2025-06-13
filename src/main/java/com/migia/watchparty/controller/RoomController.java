package com.migia.watchparty.controller;

import com.migia.watchparty.model.Device;
import com.migia.watchparty.model.Room;
import com.migia.watchparty.service.StorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.servlet.mvc.method.annotation.MvcUriComponentsBuilder;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@RestController
public class RoomController {

    private final StorageService storageService;

    @Autowired
    public RoomController(StorageService storageService){
        this.storageService = storageService;
    }


    private final List<Room> rooms = new ArrayList<>();

    @PostMapping("/rooms")
    public String createRoom(@RequestBody Room room){
        if( room != null){
            rooms.add(room);
            return "Success";
        }

        return "Failed";
    }

    @GetMapping("/rooms/{room_code}")
    public Room getRoom(@PathVariable String room_code){
        return new Room(room_code, "TV");
    }


    @PostMapping("/upload")
    public String handleFileUpload(@RequestParam("file") MultipartFile file) {
        storageService.store(file);
        return "Success";
    }
@GetMapping("/file/{filename}")
@ResponseBody
    public ResponseEntity<Resource> serveFile(@PathVariable String filename){
        Resource file = storageService.loadAsResource(filename);

    if (file == null)
        return ResponseEntity.notFound().build();

    return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,
            "attachment; filename=\"" + file.getFilename() + "\"").body(file);
}


    @GetMapping("/videos")
    @ResponseBody
    public List<String> listUploadedFiles() throws IOException {

     List<String> videos =  storageService.loadAll().map(
                        path -> MvcUriComponentsBuilder.fromMethodName(RoomController.class,
                                "serveFile", path.getFileName().toString()).build().toUri().toString())
                .toList();
return videos;

    }

}
