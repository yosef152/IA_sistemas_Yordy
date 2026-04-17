#include <iostream>
#include <set>
#include <string>
#include <vector>
using namespace std;

int tablero[3][3] = {
    {1,2,3},
    {4,5,6},
    {7,0,8}
};

int objetivo[3][3] = {
    {1,2,3},
    {4,5,6},
    {7,8,0}
};

set<string> visitado;

string estado(){
    string s="";
    for(int i=0;i<3;i++)
        for(int j=0;j<3;j++)
            s += char(tablero[i][j]+'0');
    return s;
}
string movimiento[4] = {"arriba","abajo","izquierda","derecha"};
vector<int> pasos;

bool esObjetivo(){
    for(int i=0;i<3;i++)
        for(int j=0;j<3;j++)
            if(tablero[i][j] != objetivo[i][j])
                return false;
    return true;
}

void imprimir(){
    for(int i=0;i<3;i++){
        for(int j=0;j<3;j++)
            cout<<tablero[i][j]<<" ";
        cout<<endl;
    }
    cout<<"------"<<endl;
}

int dx[4] = {-1,1,0,0};
int dy[4] = {0,0,-1,1};

bool dfs(int x,int y, int profundidad){

    if(profundidad > 20)   // limite
        return false;

    if(esObjetivo())
        return true;

    string actual = estado();

    if(visitado.count(actual))
        return false;

    visitado.insert(actual);

    for(int i=0;i<4;i++){

        int nx = x + dx[i];
        int ny = y + dy[i];

        if(nx>=0 && nx<3 && ny>=0 && ny<3){

            swap(tablero[x][y], tablero[nx][ny]);
            pasos.push_back(i);

            if(dfs(nx,ny, profundidad+1))
                return true;

            pasos.pop_back();
            swap(tablero[x][y], tablero[nx][ny]);
        }
    }

    return false;
}

int main(){

    int x,y;
visitado.clear();
    for(int i=0;i<3;i++)
        for(int j=0;j<3;j++)
            if(tablero[i][j]==0){
                x=i;
                y=j;
            }

    if(dfs(x,y,0)){
        cout<<"Movimientos:"<<endl;
        for(int i = 0; i < pasos.size(); i++)
            cout<<movimiento[pasos[i]]<<endl;
    }
}