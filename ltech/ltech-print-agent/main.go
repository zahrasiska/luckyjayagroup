package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strings"
)

type PrintRequest struct {
	Printer string `json:"printer"`
	Data    string `json:"data"`
}

func enableCORS(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
	(*w).Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
	(*w).Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding")
}

func handleStatus(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method == "OPTIONS" {
		return
	}
	fmt.Fprintf(w, "LTech Print Agent is Running on %s", runtime.GOOS)
}

func handlePrinters(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method == "OPTIONS" {
		return
	}

	var printers []string
	var err error

	if runtime.GOOS == "windows" {
		// On Windows using powershell
		out, err := exec.Command("powershell", "Get-Printer | Select-Object -ExpandProperty Name").Output()
		if err == nil {
			printers = parsePrinters(string(out))
		}
	} else if runtime.GOOS == "linux" || runtime.GOOS == "darwin" {
		// On Linux/Mac using lpstat
		out, err := exec.Command("lpstat", "-a").Output()
		if err == nil {
			printers = parsePrinters(string(out))
		}
	}

	if err != nil {
		http.Error(w, "Failed to get printers: "+err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(printers)
}

func parsePrinters(input string) []string {
	lines := strings.Split(input, "\n")
	var printers []string
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed != "" {
			// On Linux, lpstat -a returns "PrinterName accepting requests..."
			// Take only first word
			parts := strings.Fields(trimmed)
			if len(parts) > 0 {
				printers = append(printers, parts[0])
			}
		}
	}
	if len(printers) == 0 {
		return []string{"Default"}
	}
	return printers
}

func handlePrint(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method == "OPTIONS" {
		return
	}

	var req PrintRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid Payload", http.StatusBadRequest)
		return
	}

	log.Printf("Printing to %s...", req.Printer)

	if runtime.GOOS == "windows" {
		// Direct print to windows printer using temporary file and 'print' command or similar
		// For true RAW printing on Windows, one would usually use winspool APIs.
		// For this agent, we'll suggest using 'lp' or similar if available or writing to a temp file.
		err = printWindows(req.Printer, req.Data)
	} else {
		// Linux/Unix using 'lp'
		err = printLinux(req.Printer, req.Data)
	}

	if err != nil {
		http.Error(w, "Print Failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	fmt.Fprintf(w, "Success")
}

func printLinux(printer, data string) error {
	cmd := exec.Command("lp", "-d", printer)
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return err
	}

	go func() {
		defer stdin.Close()
		io.WriteString(stdin, data)
	}()

	return cmd.Run()
}

func printWindows(printer, data string) error {
	// Simple Windows implementation using temporary file and 'Notepad /p' is bad for RAW.
	// Best way for RAW is PowerShell:
	// Out-Printer -Name "PrinterName"
	// However, simple text can be sent via:
	tempFile := "print_job.txt"
	os.WriteFile(tempFile, []byte(data), 0644)
	return exec.Command("powershell", fmt.Sprintf("Get-Content %s | Out-Printer -Name '%s'", tempFile, printer)).Run()
}

func main() {
	http.HandleFunc("/status", handleStatus)
	http.HandleFunc("/printers", handlePrinters)
	http.HandleFunc("/print", handlePrint)

	port := "12345"
	log.Printf("LTech Print Agent starting on http://localhost:%s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
