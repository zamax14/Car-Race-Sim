import random
import time
import os

longitud_pista = 150
probabilidad_averia = 0.001
names = {
    1: 'alex\t',
    2: 'edgar\t',
    3: 'hector\t',
    4: 'paulino\t',
    5: 'ulises\t',
    6: 'renato\t',
    6: 'henne\t',
}
num_autos = len(names)

autos = [{"nombre": f"{names[i+1]}", "posicion": 0, "averiado": False} for i in range(num_autos)]
dibujos_autos = ["🚗", "🚙", "🚕", "🚓", "🚐", "🚚", "🚜", "🛻", "🚒"]

def mostrar_carrera():
    os.system('cls' if os.name == 'nt' else 'clear')

    for i, auto in enumerate(autos):
        pista = [' ' for _ in range(longitud_pista)]
        dibujo_auto = f"{dibujos_autos[i % len(dibujos_autos)]}"
        
        pos_auto = min(auto['posicion'], longitud_pista - len(dibujo_auto))
        pista[pos_auto:pos_auto + len(dibujo_auto)] = dibujo_auto
        
        estado_auto = " (Averiado)" if auto['averiado'] else ""
        print(f"{auto['nombre']}: |{''.join(pista)}|{estado_auto}")

    print("\n")

def avanzar_autos():
    for auto in autos:
        if not auto['averiado']:
            if random.random() < probabilidad_averia:
                auto['averiado'] = True
            else:
                auto['posicion'] += random.randint(1, 3)

def carrera():
    while any((auto['posicion'] < longitud_pista) and (auto['averiado'] != True) for auto in autos):
        avanzar_autos()
        mostrar_carrera()
        time.sleep(0.1)

    autos_terminados = sorted(autos, key=lambda x: x['posicion'], reverse=True)
    
    mostrar_podio(autos_terminados)

def mostrar_podio(autos_terminados):
    print("\n--- Podio ---")
    podio = ["🥇 Primer Lugar", "🥈 Segundo Lugar", "🥉 Tercer Lugar"]
    
    for i in range(min(3, len(autos_terminados))):
        estado_auto = " (Averiado)" if autos_terminados[i]['averiado'] else ""
        print(f"{podio[i]}: {autos_terminados[i]['nombre']}{estado_auto}")
    
    if len(autos_terminados) > 3:
        print("\n--- Resultados Finales ---")
        for i in range(3, len(autos_terminados)):
            estado_auto = " (Averiado)" if autos_terminados[i]['averiado'] else ""
            print(f"{i+1}° Lugar: {autos_terminados[i]['nombre']}{estado_auto}")

carrera()