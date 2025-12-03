import numpy as np
import clases

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

    categorias = ["1. Personal", "2. Inversion", "3. Deposito"]
    while True:
        (print("Indique la categoria de su flujo financiero:"))
        for i, categoria in enumerate(categorias):
            print(f'  {i+1}. {categoria}')
        
        index = (input("Numero de categoria seleccionado: ")) - 1

        if index.isalpha():
            if index in range(len(categorias)):
                break
        else:
            print('Caracter invalido')

    if categoria == 'personal':
        nombre_gasto = input("Nombre de su gasto:")
        cantidad_gasto = float(input("Cantidad de su gasto:"))

    elif categoria == 'inversion':
        pass

    elif categoria == 'deposito':
        nombre_gasto = input("Nombre de su deposito:")
        cantidad_gasto = float(input("Cantidad de su deposito:"))


def gasto_a_file():
    pass

def summary():
    pass




if __name__ == '__main__':
    main()