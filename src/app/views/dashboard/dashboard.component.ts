import { Component, OnInit } from '@angular/core';
import { AlertService, OshaService, DashboardService, EnterpriseService } from '../../_services';
import { dashboardItems } from '../../_dashboard';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';

@Component({
  templateUrl: 'dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  // Pie
  public pieChartLabels: string[] = ['# of BAs', '# of BAs'];
  public pieChartData: number[] = [300, 500];
  public pieChartType = 'pie';
  
  // Doughnut
  public doughnutChartLabels: string[] = ['# of BAs', '# of BAs'];
  public doughnutChartData: number[] = [350, 450];
  public doughnutChartType = 'doughnut';
  // Dashboard Kind
  public current_dashboard_type; // default OSHA
  public dashboardItems = dashboardItems;
  public org_name: string = '';
  // Enterprise Totals
  public force_totals: any = [];
  public force_children: any = null;
  public child_org_id:string = '';

  constructor(private alertService: AlertService, private oshaService: OshaService, 
              public dashboardService: DashboardService, public enterpriseService: EnterpriseService,
              private route:ActivatedRoute, private router:Router) {
    
    let org_words = localStorage.getItem('org_name').split(' ');
    let temp_org = '';
    for(let word of org_words)
    {
      temp_org += word.charAt(0).toUpperCase() + word.slice(1) + ' ';
    }
    this.org_name = temp_org;

    this.oshaService.current_dashboard_type.subscribe(
      (type) => {
        this.current_dashboard_type = type;
        if(type.length > 0){
          this.doDashboard();
        }
      }
    );

    //=== Get child organziation id ===
    route.queryParams.subscribe(params=>{
      if(params.hasOwnProperty('child'))
        this.child_org_id = params.child
    });
    //==================================
    this.router.routeReuseStrategy.shouldReuseRoute = function(){
      return false;
    };
    
    this.router.events.subscribe((evt) => {
        if (evt instanceof NavigationEnd) {
            this.router.navigated = false;
            window.scrollTo(0, 0);
        }
    });
  }

  ngOnInit(): void {
    this.enterpriseService.get_children_totals(this.child_org_id).subscribe( data=> {
      if(data.totalSize == 1){
        this.force_totals = data.records[0]
        this.force_children = this.force_totals.Partners__r
      }
    },
    err=>{
      if(err == "Bad Request"){
        this.router.navigateByUrl('/dashboard');
        
      }
    });
  }

  doDashboard(){
    let index = 0;
    for(var item of this.dashboardItems[this.current_dashboard_type]) {
      

      let table_name = item.url.replace( '/', '' );
      item.isloading = true;
      if(table_name == 'dashboard_type') //For Hipaa
      {
        this.dashboardService.get_dashboard_type(this.remove__c(item.url_type), item.url_filter, index, this.current_dashboard_type).subscribe( res => {
          this.dashboardItems[res.type][res.index].isloading = false;
          
          if (Array.isArray(res.data))
          {
            this.dashboardItems[res.type][res.index].data = res.data[0].data.length
          }
          else
          {
            this.dashboardItems[res.type][res.index].data = 0
          }
          
        }, 
        err => {

        })
      }
      else // For Osha
      {
        this.oshaService.get_object_fields(table_name, index, this.current_dashboard_type).subscribe( data=>{

          let api_url = data.fields[0].api_url_value;
          this.oshaService.get_objects(api_url, data.index, data.type).subscribe(res => {
         
            this.dashboardItems[res.type][res.index].isloading = false;
            // Integer
            if(this.dashboardItems[res.type][res.index].type == 'integer'){
      
              let message = res.message;
              this.dashboardItems[res.type][res.index].data = message.split(' ')[0];
            }
            // Date
            else if(this.dashboardItems[res.type][res.index].type == 'date'){
              var date='1945-05-09';
              // Review_Date
              for(var key in res.data) {
                if( (new Date(date).valueOf() < new Date(res.data[key].Review_Date).valueOf()) && (res.data[key].Review_Date != null) )
                {
                  date = res.data[key].Review_Date
                  let __date = new Date(date)

                  date = this.pad(__date.getMonth()+1) + '-' + this.pad(__date.getDate()) + '-' + __date.getFullYear();
                }
              }
              if(res.data.length == 0 || date == '1945-05-09')
                date = ''

              this.dashboardItems[res.type][res.index].data = date
            }
          },
          err=>{
            console.log(err);
          })
  
        });
      }
      index++;
    }
  }
  pad(n)
  {
    return n<10 ? '0'+n : n
  }
  remove__c(string){
    return string.trim().replace(/\__c/gi, "");
  }
  replace_space(string){
    return string.replace(/\_/gi, " ");
  }
}
