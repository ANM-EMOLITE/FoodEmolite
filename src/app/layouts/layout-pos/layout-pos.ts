import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AgentTopbarComponent } from '../layout-agent/agent-topbar/agent-topbar';
import { ProfileService } from '../../common/services/profile.service';
import { RealtimeService } from '../../common/services/realtime.service';

/** Layout bán hàng tại quầy (POS): topbar của agent + trang đặt món của cửa hàng, không có sidebar. */
@Component({
  selector: 'app-layout-pos',
  imports: [RouterOutlet, AgentTopbarComponent],
  templateUrl: './layout-pos.html'
})
export class LayoutPosComponent implements OnInit, OnDestroy {
  private readonly profileService = inject(ProfileService);
  private readonly realtimeService = inject(RealtimeService);

  ngOnInit(): void {
    // Giống layout agent: vào group của cửa hàng để topbar nhận thông báo đơn hàng mới (kể cả đơn tạo tại quầy).
    this.realtimeService.connect();

    this.profileService.getMyProfile().subscribe(response => {
      const storeRefCode = response.data?.store?.refCode;

      if (response.isSuccess && storeRefCode) {
        this.realtimeService.joinStoreGroup(storeRefCode);
      }
    });
  }

  ngOnDestroy(): void {
    this.realtimeService.disconnect();
  }
}
