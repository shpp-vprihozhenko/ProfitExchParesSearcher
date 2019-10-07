import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { StartComponent } from './start/start.component';
import { MainBoardComponent } from './main-board/main-board.component';

const routes: Routes = [
  {path: '', component: StartComponent},
  {path: 'mainBoard', component: MainBoardComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
