import tkinter as tk
from tkinter import filedialog
import yt_dlp

def descargar_video():
    # 1. Pegar el link de YouTube
    url = input("Mete el link de YouTube aquí: ").strip()
    if not url:
        print("No pusiste ni pincho de link.")
        return

    # 2. Abrir ventana para elegir dónde guardar
    print("Selecciona en la ventana flotante dónde quieres guardar el video...")
    root = tk.Tk()
    root.withdraw() # Oculta la ventana principal de tkinter
    
    # Abre el selector de carpetas
    carpeta_destino = filedialog.askdirectory(title="¿Dónde vas a guardar el video, causa?")
    
    if not carpeta_destino:
        print("Cancelaste la selección de carpeta. Proceso abortado.")
        return

    # 3. Configuración de yt-dlp (Descarga video + audio combinado en la mejor calidad)
    options = {
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        'outtmpl': f'{carpeta_destino}/%(title)s.%(ext)s',
    }

    # 4. Descargar
    try:
        print("\nDescargando... Espérate un toque, no desesperes...")
        with yt_dlp.YoutubeDL(options) as ydl:
            ydl.download([url])
        print(f"\n¡Listo, huevón! Video descargado en: {carpeta_destino}")
    except Exception as e:
        print(f"\nSe maleó algo en la descarga: {e}")

if __name__ == "__main__":
    descargar_video()