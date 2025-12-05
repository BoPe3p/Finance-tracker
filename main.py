import numpy as np
from clases import Gasto, Inversion, Deposito, Saldo

def main():
    print('Hola Rafael')

    # Input Gasto
    pedir_gasto()

    # Trabajar con csv pa tener la info
    gasto_a_file()

    # Resumen
    summary()
    pass

def pedir_gasto():

    categorias = ["Personal", "Inversion", "Deposito"]
    while True:
        (print("Indique la categoria de su flujo financiero:"))
        for i, categoria in enumerate(categorias):
            print(f'  {i+1}. {categoria}')
        
        index = (input("Numero de categoria seleccionado: ")) - 1

        if index.isalpha():
            if int(index) in range(len(categorias)):
                categoria = categorias[int(index)]
                break
        else:
            print('Caracter invalido')

    if categoria == 'Personal':
        nombre_gasto = input("Nombre de su gasto:")
        cantidad_gasto = -1
        while cantidad_gasto == -1:
            try:
                cantidad_gasto =float(input("Cantidad de su gasto:"))
            except:
                print('Gasto invalido')
        nuevo_gasto = Gasto(nombre_gasto, categoria, cantidad_gasto)

    elif categoria == 'inversion':
        nombre_inversion = input("Nombre de su inversion:")
        cantidad_invertida = float(input("Cantidad de su deposito:"))

    elif categoria == 'deposito':
        nombre_deposito = input("Nombre de su deposito:")
        cantidad_depositada = float(input("Cantidad de su deposito:"))


def gasto_a_file():
    pass

def summary():
    pass




if __name__ == '__main__':
    main()