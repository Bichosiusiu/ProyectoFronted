import { AfterViewInit, Component, ElementRef, OnInit ,ViewChild,inject} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TipoMetricaDTO } from '../../../models/tipoMetricaDTO.model';
import { TipoMetricaService } from '../../../services/tipoMetrica.service';
import { TipoMetrica } from '../../../models/tipoMetrica.model';
import { RegistroRendimientoDTO } from '../../../models/registroRendimientoDTO.model';
import { RegistroRendimientoService } from '../../../services/registroRendimiento.service';
import { RegistroRendimiento } from '../../../models/registroRendimiento.model';
import { forkJoin, Subscription } from 'rxjs';
import { ObjetivoRendimientoDTO } from '../../../models/objetivoRendimientoDTO.model';
import { ObjetivoRendimiento } from '../../../models/objetivoRendimiento.model';
import { ObjetivoRendimientoService } from '../../../services/objetivoRendimiento.service';
import { MedicionFisicaService } from '../../../services/medicionFisica.service';
import { EvolucionFisicaDTO } from '../../../models/evolucionFisicaDTO.model';
import { Chart, registerables } from 'chart.js';
import { CheckInRutinaService } from '../../../services/checkinrutina.service';
import { ProgresoObjetivoDTO } from '../../../models/progresoObjetivoDTO.model';
Chart.register(...registerables);
@Component({
  selector: 'app-rendimiento',
  imports: [FormsModule,CommonModule,ReactiveFormsModule,MatTooltipModule],
  templateUrl: './rendimiento.component.html',
  styleUrl: './rendimiento.component.css'
})
export class RendimientoComponent implements OnInit,AfterViewInit{
  private mfservice = inject(MedicionFisicaService)
  private tmservice = inject(TipoMetricaService)
  private rrservice = inject(RegistroRendimientoService)
  private orservice= inject (ObjetivoRendimientoService)
  private crservice= inject(CheckInRutinaService)
  private oservice = inject(ObjetivoRendimientoService)
  currentView: 'metrics' | 'records' | 'goals' = 'metrics';
  showrendimientoForm= false
  showgoalsForm= false
  loading = true;
  metricForm: FormGroup ;
  recordForm: FormGroup;
  goalForm: FormGroup;
  sports: any[] = [];
  metrics: TipoMetrica[] = [];
  athleteMetrics: any[] = [];
  records: RegistroRendimiento[] = [];
  goals: ObjetivoRendimiento[] = [];
  filteredRecords: any[] = [];
  athleteProfile: any;
  selectedMetric: any = null;
  dateRange = { start: "12/11/2025", end: "24/01/2026" };
  performanceChart: any;
  showmetricaForm: boolean =false

  @ViewChild('rutinasChart') private chartRef!: ElementRef;
  objetivos: ProgresoObjetivoDTO[] = [];
  chart2!: Chart;
  datosC: any;
  datos: EvolucionFisicaDTO[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  private chart: Chart | null = null;
  private subs: Subscription[] = [];
  rangos = [
    { value: '1m', label: 'Último mes' },
    { value: '3m', label: 'Últimos 3 meses' },
    { value: '6m', label: 'Últimos 6 meses' },
    { value: '1a', label: 'Último año' },
    { value: 'todo', label: 'Todo' }
  ];
  rangoSeleccionado = '3m';
  constructor(
    private fb: FormBuilder,
  ) {
    this.metricForm = this.fb.group({
      nombre: ['', Validators.required],
      unidad: ['', Validators.required],
      esObjetivo: [false]
    });
    this.recordForm = this.fb.group({
      idmetrica: [null, Validators.required],
      valor: ['', [Validators.required, Validators.min(0)]],
      fecha: [new Date(), Validators.required],
      comentarios: ['']
    });
    this.goalForm = this.fb.group({
      idmetrica: ['', Validators.required],
      valorObjetivo: ['', [Validators.required, Validators.min(0)]],
      fechaObjetivo: ['', Validators.required],
      prioridad: [1, [Validators.min(1), Validators.max(5)]],
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.cargarDatos();
  }
  cargarDatos() {
    const token =localStorage.getItem("token")
    const id = localStorage.getItem("id")
    if(!token) {
      throw new Error("Not Token Found")
    }
    this.isLoading = true;
    this.errorMessage = null;
    const sub = this.mfservice.getEvolucionFisica(Number(id), this.rangoSeleccionado,token)
      .subscribe({
        next: (data) => {
          this.datos = data;
          console.log(data)
          this.renderizarGrafico();
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = err.message || 'Error al cargar los datos';
          this.isLoading = false;
        }
      });
    
    this.subs.push(sub);
    this.crservice.getCumplimientoRutinas(Number(id), this.rangoSeleccionado,token)
      .subscribe({
        next: (data) => {
          this.datosC = data;
          this.renderizarGrafico2();
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Error al cargar los datos';
          this.isLoading = false;
        }
      });

      this.orservice.getProgresoObjetivos(Number(id),token)
      .subscribe({
        next: (data) => {
          this.objetivos = data;
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = 'Error al cargar los objetivos';
          this.isLoading = false;
        }
      });
  }

  getClasePorcentaje(porcentaje: number): string {
    if (porcentaje >= 80) return 'bg-success';
    if (porcentaje >= 50) return 'bg-warning';
    return 'bg-danger';
  }
  renderizarGrafico2() {
    if (!this.chartRef?.nativeElement || !this.datos) return;

    if (this.chart2) {
      this.chart2.destroy();
    }

    const ctx = this.chartRef.nativeElement.getContext('2d');
    this.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Completadas', 'Incompletas'],
        datasets: [{
          data: [this.datosC.completadas, this.datosC.incompletas],
          backgroundColor: ['#4CAF50', '#F44336'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: {
            display: true,
            text: `Cumplimiento: ${this.datosC.porcentajeCompletadas}%`,
            font: { size: 16 }
          }
        },
        cutout: '70%'
      }
    });
  }

  getDiasOrdenados(): string[] {
    const ordenDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    return ordenDias.filter(dia => this.datosC?.rutinasPorDia[dia]);
  }
  ngAfterViewInit() {
    this.cargarDatos();
  }
  renderizarGrafico() {
    const ctx = document.getElementById('evolucionChart') as HTMLCanvasElement;
    if (this.chart) {
      this.chart.destroy();
    }
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.datos.map(d => new Date(d.fecha).toLocaleDateString()),
        datasets: [
          {
            label: 'Peso (kg)',
            data: this.datos.map(d => d.peso),
            borderColor: '#3e95cd',
            backgroundColor: 'rgba(62, 149, 205, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            yAxisID: 'y'
          },
          {
            label: 'IMC',
            data: this.datos.map(d => d.imc),
            borderColor: '#8e5ea2',
            backgroundColor: 'rgba(142, 94, 162, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            yAxisID: 'y1'
          },
          {
            label: 'Masa Muscular (kg)',
            data: this.datos.map(d => d.masaMuscular),
            borderColor: '#3cba9f',
            backgroundColor: 'rgba(60, 186, 159, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            yAxisID: 'y'
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Evolución Física',
            font: { size: 16 }
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Fecha'
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Peso y Masa Muscular (kg)'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'IMC'
            },
            grid: {
              drawOnChartArea: false
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    });
  }

  cambiarRango(nuevoRango: string) {
    this.rangoSeleccionado = nuevoRango;
    this.cargarDatos();
  }

  mostrarFormRendimiento(){
    this.showrendimientoForm= true
  }
  mostrarFormMetrica(){
    this.showmetricaForm=true
  }
  mostrarFormObjetivos(){
    this.showgoalsForm=true
  }
  cancelar(){
    this.showmetricaForm=false
  }
  loadInitialData() {
    const token =localStorage.getItem("token")
    const id = localStorage.getItem("id")
    if(!token) {
      throw new Error("Not Token Found")
    }
    forkJoin({
                metrics: this.tmservice.list(Number(id), token),
                records: this.rrservice.list(Number(id), token),
                goals : this.orservice.list(Number(id),token)
              }).subscribe({
                next: (data) => {
                  this.metrics = data.metrics;
                  this.records = data.records;
                  this.goals = data.goals
                  this.loading= false
                },
                error: (err) => {
                  console.error("Error loading data", err);
                  this.loading=false
                }
              });
  }

  filterRecords(): void {
    this.filteredRecords = [...this.records];
    
    if (this.selectedMetric) {
      this.filteredRecords = this.filteredRecords.filter(r => r.metricId === this.selectedMetric.id);
    }
    
    if (this.dateRange.start && this.dateRange.end) {
      this.filteredRecords = this.filteredRecords.filter(r => {
        const recordDate = new Date(r.date);
        return recordDate >= new Date(this.dateRange.start) && 
               recordDate <= new Date(this.dateRange.end);
      });
    }
  }

  async addMetric(){
    const token =localStorage.getItem("token")
    if(!token) {
      throw new Error("Not Token Found")
    }
    if (this.metricForm.invalid) return;
    const newMetric : TipoMetricaDTO= this.metricForm.value
    newMetric.iddeporte = Number(localStorage.getItem("idDeporte"))
    newMetric.iddeportista = Number(localStorage.getItem("id"))
    console.log(newMetric)
    this.tmservice.add(newMetric,token).subscribe({
      next:(data)=>{
        console.log(data)

      },
      error:(err)=>{
        console.error(err)
      }
    })
  }

  async addRecord(){
    console.log("hola")
    const token =localStorage.getItem("token")
    if(!token) {
      throw new Error("Not Token Found")
    }
    console.log("hola")
    if (this.recordForm.invalid) return;
    console.log("hola")
    const newRecord : RegistroRendimientoDTO= this.recordForm.value
    newRecord.iddeportista = Number(localStorage.getItem("id"))
    console.log(newRecord)
    this.rrservice.add(newRecord,token).subscribe({
      next:(data)=>{
        console.log(data)

      },
      error:(err)=>{
        console.error(err)
      }
    })
  }

  async addGoal(){
    console.log("hola")
    const token =localStorage.getItem("token")
    if(!token) {
      throw new Error("Not Token Found")
    }
    if (this.goalForm.invalid) return;
    const newGoal : ObjetivoRendimientoDTO= this.goalForm.value
    newGoal.iddeportista = Number(localStorage.getItem("id"))
    this.orservice.add(newGoal,token).subscribe({
      next:(data)=>{
        console.log(data)

      },
      error:(err)=>{
        console.error(err)
      }
    })
  }

  toggleGoalCompletion(goal: any): void {
  }

  deleteItem(type: 'metric' | 'record' | 'goal', id: number): void {

  }

  showSuccess(message: string): void {
  }

  // Métodos de simulación de API
  private async getSports(): Promise<any[]> {
    return [
      { id: 1, name: 'Fútbol', type: 'Equipo' },
      { id: 2, name: 'Baloncesto', type: 'Equipo' },
      { id: 3, name: 'Vóleybol', type: 'Equipo' }
    ];
  }

  private async getMetrics(): Promise<any[]> {
    return [
      { id: 1, name: 'Velocidad 40m', unit: 'seg', sportId: 1, isGoal: true },
      { id: 2, name: 'Salto vertical', unit: 'cm', sportId: 1, isGoal: true },
      { id: 3, name: 'Resistencia', unit: 'min', sportId: 1, isGoal: true },
      { id: 4, name: 'Precisión de tiro', unit: '%', sportId: 2, isGoal: true },
      { id: 5, name: 'Fuerza piernas', unit: 'kg', sportId: 1, isGoal: false }
    ];
  }

  private async getRecords(): Promise<any[]> {
    const today = new Date();
    const records = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date();
      date.setMonth(today.getMonth() - (4 - i));
      records.push({
        id: i + 1,
        athleteId: 1,
        metricId: 1,
        value: +(6.5 - (i * 0.2)).toFixed(1),
        date: date.toISOString().split('T')[0],
        comments: i === 4 ? 'Mejor marca personal' : ''
      });
    }
    
    return records;
  }

  private async getGoals(): Promise<any[]> {
    return [
      {
        id: 1,
        athleteId: 1,
        metricId: 1,
        metricName: 'Velocidad 40m',
        targetValue: 5.8,
        targetDate: '2024-12-31',
        establishedDate: '2024-01-15',
        completed: false,
        priority: 1,
        comments: 'Objetivo para fin de temporada'
      },
      {
        id: 2,
        athleteId: 1,
        metricId: 2,
        metricName: 'Salto vertical',
        targetValue: 65,
        targetDate: '2024-10-01',
        establishedDate: '2024-02-20',
        completed: false,
        priority: 2,
        comments: 'Mejorar capacidad de salto'
      }
    ];
  }
}
