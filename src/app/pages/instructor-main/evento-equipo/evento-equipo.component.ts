import { Component, OnInit,inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; 
import { Evento } from '../../../models/evento.model';
import { forkJoin } from 'rxjs';
import { EventoService } from '../../../services/evento.service';
import { Equipo } from '../../../models/equipo.model';
import { EventoEquipoDTO } from '../../../models/eventoEquipoDTO.model';
import { EventoEquipoService } from '../../../services/eventoEquipo.service';
import { EquipoService } from '../../../services/equipo.service';
import { EventoEquipo } from '../../../models/eventoEquipo.model';
import { EventoFecha } from '../../../models/eventoFecha.model';
import { EventoFechaService } from '../../../services/eventoFecha.service';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import Swal from 'sweetalert2';
@Component({
    selector: 'app-evento-equipo',
    standalone: true,
    imports: [FormsModule, CommonModule, RouterModule,MatIconModule, MatSnackBarModule,
    MatDialogModule ],
    templateUrl: './evento-equipo.component.html',
    styleUrl: './evento-equipo.component.css'
})
export class EventoEquipoComponent implements OnInit{
  private eservice= inject(EventoService)
  private eeservice = inject(EventoEquipoService)
  private eqservice = inject(EquipoService)
  private efservice = inject(EventoFechaService)
  private snackBar = inject(MatSnackBar);
   private dialog = inject(MatDialog);
  eventoSeleccionado:any= null
  eventos : Evento[] = []
  terminoBusqueda: string = '';
  mostrarDetallesEvento = false
  mostrarModalAsociarEquipo = false
  equipoSeleccionado : number = 0
  fechasEvento : EventoFecha[]=[]
  equiposDisponibles : Equipo[] = []
  equiposDisponiblesEvento:Equipo[]=[]
  equiposPorEvento:Equipo[]=[]
  equiposInscritos : EventoEquipo[] = []
  categoriaSeleccionada : string = ""
  nombreInstructor: string = '';
  vistaActual: 'detalles' | 'equipos' | 'fechas' = 'detalles';
  fotoPerfil: string = '';
  showUserDropdown: boolean = false;
  eventosFiltrados: Evento[] = [];
  filtroDeporte: string = '';
  filtroEstado: string = '';
  equipoSeleccionadoId: string | null = null;
  isLoading = false;
  equipos : Equipo[]=[]
  ngOnInit(): void {
    this.isLoading = true;
    try{
      const token=localStorage.getItem("token")
      const idDeporte = Number(localStorage.getItem("idDeporte"))
      const idInstructor= Number(localStorage.getItem("id"))
      if(!token) {
        throw new Error("Not Token Found")
      }
      forkJoin({
        eventos: this.eservice.list(idDeporte, token),
        equipos: this.eqservice.list(idInstructor,token)
      }).subscribe({
        next: (data) => {
          this.eventos = data.eventos;
          this.filtrarEventos()
          this.equipos = data.equipos
          this.filtrarEquipos()
          this.isLoading = false;
        },
        error: (err) => {
          console.error("Error loading data", err);
          this.mostrarErrorSweetAlert('Error ', 'Error al cargar datos');
          this.isLoading = false;
        }
      });
      
    }catch(error:any){
      alert(error.message)
    }
  }
  filtrarEquipos():void{
    this.equiposDisponibles=this.equipos.filter(equipo =>equipo.jugadoresAsociados==equipo.maxJugadores)
    console.log(this.equipos)
    console.log(this.equiposDisponibles)
  }
  verDetallesEvento(evento:Evento){
    this.eventoSeleccionado = evento
    this.isLoading = true;
    const token=localStorage.getItem("token")
    this.vistaActual = 'detalles';
    if(!token) {
      throw new Error("Not Token Found")
    }
    forkJoin({
      equiposDisponibles : this.eeservice.listEquiposEvento(evento.id,token),
      eventosFechas : this.efservice.list(evento.id,token)
    }).subscribe({
      next: (data) => {
        this.equiposPorEvento = data.equiposDisponibles
        this.fechasEvento = data.eventosFechas
         this.isLoading = false;
      },
      error: (err) => {
        console.error("Error loading data", err);
        this.mostrarErrorSweetAlert('Error', 'No se pudieron cargar los datps del evento');
         this.isLoading = false;
      }
      });
      this.mostrarDetallesEvento=true
    }
  abrirModalAsociarEquipo(evento:Evento){
    this.eventoSeleccionado = evento
    const token=localStorage.getItem("token")
    if(!token) {
      throw new Error("Not Token Found")
    }
    forkJoin({
      equiposDisponibles : this.eeservice.listEquiposEvento(evento.id,token)
    }).subscribe({
      next: (data) => {
        this.equiposPorEvento = data.equiposDisponibles,
        this.borrarRepetidas()
      },
      error: (err) => {
        console.error("Error al cargar equipos disponibles", err);
        this.mostrarErrorSweetAlert('Error', 'No se pudieron cargar los equipos disponibles');
      }
    });
    console.log(this.equiposPorEvento)
      this.mostrarModalAsociarEquipo=true
    }
    desasociarEquipo(equipo: Equipo, evento: Evento): void {

  }
    borrarRepetidas():void {
      if(this.equiposPorEvento.length>0) {
      const idsB = new Set(this.equiposPorEvento.map(obj => obj.id));
      this.equiposDisponiblesEvento = this.equiposDisponibles.filter(obj => !idsB.has(obj.id));
      }else{
      this.equiposDisponiblesEvento = this.equiposDisponibles
      }
    }
    asociarEquipo(){
    console.log(this.equipoSeleccionado)
    if (this.equipoSeleccionado==0) {
      this.mostrarAdvertenciaSweetAlert('Selección requerida', 'Debes seleccionar un equipo');
      return;
    }
          if(this.eventoSeleccionado?.numMaxEquipos == this.eventoSeleccionado.equiposInscritos){
            this.mostrarAdvertenciaSweetAlert('Selección requerida', 'Debes seleccionar un equipo');
      return;
          }else{
            this.isLoading = true;
          if (this.equipoSeleccionado !== null) {
            const token=localStorage.getItem("token")
                if(!token) {
                  throw new Error("Not Token Found")
                }
                const nuevaVinculacion: EventoEquipoDTO = {
                      idEvento: this.eventoSeleccionado?.id,
                      idEquipo: this.equipoSeleccionado
                    };
                console.log(nuevaVinculacion.idEquipo)
                this.eeservice.add(nuevaVinculacion, token).subscribe({
                      next:(data)=>{
                        this.mostrarExitoSweetAlert(
          'Equipo asociado', 
          `El equipo ha sido asociado correctamente al evento ${this.eventoSeleccionado?.nombre}`
        );
                        this.mostrarModalAsociarEquipo = false;
                        this.isLoading= false
                      },
                      error:(err)=>{
                        console.error("Error al asociar equipo", err);
                        this.mostrarErrorSweetAlert('Error', 'No se pudo asociar el equipo al evento. Por favor, inténtalo de nuevo.');
                        this.isLoading = false;
                      }
                    })
            
            this.mostrarModalAsociarEquipo = false;
          } else {
            console.error('No se ha seleccionado ningún jugador');
          }
        }
    }
    filtrarEventos(): void {
      this.eventosFiltrados = this.eventos.filter(evento => {
        const coincideBusqueda = !this.terminoBusqueda || 
          evento.nombre.toLowerCase().includes(this.terminoBusqueda.toLowerCase()) ||
          evento.descripcion.toLowerCase().includes(this.terminoBusqueda.toLowerCase());
        const coincideEstado = !this.filtroEstado || 
          evento.estado === this.filtroEstado;
        
        return coincideBusqueda && coincideEstado;
      });
    }
    getImagenEvento(evento: Evento): string {
      return evento.imagen 
        ? `http://localhost:8080/${evento.imagen}`
        : 'assets/default-event.jpg';
    }
  
  mostrarExitoSweetAlert(titulo: string, mensaje: string): void {
    Swal.fire({
      title: titulo,
      text: mensaje,
      icon: 'success',
      confirmButtonColor: '#10b981', 
      background: '#1f2937',
      color: '#fff', 
      iconColor: '#10b981' 
    });
  }
  mostrarErrorSweetAlert(titulo: string, mensaje: string): void {
    Swal.fire({
      title: titulo,
      text: mensaje,
      icon: 'error',
      confirmButtonColor: '#ef4444', 
      background: '#1f2937', 
      color: '#fff', 
      iconColor: '#ef4444' 
    });
  }
  mostrarAdvertenciaSweetAlert(titulo: string, mensaje: string): void {
    Swal.fire({
      title: titulo,
      text: mensaje,
      icon: 'warning',
      confirmButtonColor: '#f59e0b', 
      background: '#1f2937', 
      color: '#fff', 
      iconColor: '#f59e0b' 
    });
  }
    toggleUserDropdown(): void {
      this.showUserDropdown = !this.showUserDropdown;
    }
  
    logout(): void {
    }
}
