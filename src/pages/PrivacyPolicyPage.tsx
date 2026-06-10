import React from 'react';
import './PrivacyPolicyPage.css';

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="privacy-container">
      <div className="privacy-card glass-panel">
        <h1>Privacy Policy</h1>
        <p className="last-updated">Last updated: June 9, 2026</p>
        
        <div className="privacy-section">
          <h2>AniSpace 隱私權政策 (繁體中文)</h2>
          <p>
            ZhangYuShao 開發了 AniSpace 應用程式。本服務由 ZhangYuShao 免費提供，並按原樣提供使用。 此頁面用於告知決定使用我們服務的用戶，關於我們收集、使用和披露個人資訊的政策。
          </p>
          
          <h3>1. 資訊收集與使用</h3>
          <p>為了提供更好的體驗，在使用我們的服務時，我們可能會要求您提供某些個人識別資訊。</p>
          <ul>
            <li>
              <strong>Google 登入與身分驗證：</strong> 我們的應用程式使用 Google 登入 (Google Sign-In) 進行身分驗證。當您登入時，我們僅會接收由 Google 授權的基本個人資料（如您的電子郵件地址與名稱）。此資訊嚴格僅用於應用程式內的身分確認與提供個人化體驗，我們不會將此資料儲存於外部私人伺服器，也不會分享給第三方。
            </li>
            <li>
              <strong>本機資料儲存：</strong> 您的個人動畫追蹤紀錄、偏好設定與清單等資料，皆安全地儲存於您設備的本機端 (Local Storage)。我們不會將這些私人數據上傳或同步至我們的伺服器。
            </li>
          </ul>

          <h3>2. 第三方服務</h3>
          <p>本應用程式確實使用了可能收集可識別您身分資訊的第三方服務。 以下為本應用程式使用的第三方服務提供商的隱私權政策連結：</p>
          <ul>
            <li>Google Play 服務</li>
            <li>AdMob</li>
            <li>Google Analytics for Firebase</li>
          </ul>

          <h3>3. 錯誤日誌數據</h3>
          <p>
            我們希望通知您，每當您使用我們的服務時，若應用程式發生錯誤，我們會（透過第三方產品）收集您手機上的數據和資訊，稱為日誌數據 (Log Data)。這些數據可能包含設備 IP 地址、設備名稱、作業系統版本、應用程式設定、使用的時間與日期以及其他統計數據，僅用於修復錯誤及改善品質。
          </p>

          <h3>4. 聯絡我們</h3>
          <p>
            如果您對我們的隱私權政策有任何疑問或建議，請隨時透過以下電子郵件與我們聯絡：
            <a href="mailto:sar0977@gmail.com">sar0977@gmail.com</a>
          </p>
        </div>

        <div className="privacy-divider" />

        <div className="privacy-section english-section">
          <h2>Privacy Policy for AniSpace (English)</h2>
          <p>
            ZhangYuShao built the AniSpace app as a Free app. This SERVICE is provided by ZhangYuShao at no cost and is intended for use as is. This page is used to inform visitors regarding our policies with the collection, use, and disclosure of Personal Information if anyone decided to use our Service.
          </p>
          
          <h3>1. Information Collection and Use</h3>
          <p>For a better experience, while using our Service, we may require you to provide us with certain personally identifiable information.</p>
          <ul>
            <li>
              <strong>Google Sign-In / Authentication:</strong> Our app utilizes Google Sign-In for user authentication. When you log in, we receive your basic profile information (such as your email address and name) authorized by Google. This information is used strictly for identity verification within the app and to personalize your experience. We do not store this data on external private servers or share it with third parties.
            </li>
            <li>
              <strong>Local Data Storage:</strong> Your personal animation tracking data, preferences, and lists are saved locally on your device (Local Storage). We do not upload or sync this private data to our servers.
            </li>
          </ul>

          <h3>2. Third-Party Services</h3>
          <p>The app does use third-party services that may collect information used to identify you. Link to the privacy policy of third-party service providers used by the app:</p>
          <ul>
            <li>Google Play Services</li>
            <li>AdMob</li>
            <li>Google Analytics for Firebase</li>
          </ul>

          <h3>3. Log Data</h3>
          <p>
            We want to inform you that whenever you use our Service, in a case of an error in the app we collect data and information (through third-party products) on your phone called Log Data. This Log Data may include information such as your device Internet Protocol (“IP”) address, device name, operating system version, the configuration of the app when utilizing our Service, the time and date of your use of the Service, and other statistics.
          </p>

          <h3>4. Contact Us</h3>
          <p>
            If you have any questions or suggestions about our Privacy Policy, do not hesitate to contact us at: 
            <a href="mailto:sar0977@gmail.com">sar0977@gmail.com</a>
          </p>
        </div>

        <div className="privacy-divider" />

        <div className="privacy-section japanese-section">
          <h2>AniSpace プライバシーポリシー (日本語)</h2>
          <p>
            ZhangYuShao は AniSpace アプリを無料アプリとして構築しました。本サービスは ZhangYuShao によって無償で提供されており、現状のまま使用することを目的としています。このページは、当社のサービスを利用することを決定した方に対して、個人情報の収集、使用、開示に関する当社のポリシーを通知するために使用されます。
          </p>
          
          <h3>1. 情報の収集と利用</h3>
          <p>より良い体験を提供するため、当社のサービスを利用する際に、特定の個人を識別できる情報の提供をお願いする場合があります。</p>
          <ul>
            <li>
              <strong>Google ログインと認証：</strong> 当アプリはユーザー認証に Google ログインを利用しています。ログイン時、Google によって許可された基本的なプロフィール情報（メールアドレスや名前など）のみを受け取ります。この情報は、アプリ内での本人確認およびパーソナライズされた体験の提供のみに厳密に使用され、外部のプライベートサーバーに保存したり、第三者と共有したりすることはありません。
            </li>
            <li>
              <strong>ローカルデータの保存：</strong> 個人のアニメ追跡データ、設定、リストなどのデータは、ご利用の端末（ローカルストレージ）に安全に保存されます。これらのプライベートデータを当社のサーバーにアップロードまたは同期することはありません。
            </li>
          </ul>

          <h3>2. サードパーティサービス</h3>
          <p>当アプリは、個人を特定するために使用される情報を収集する可能性のあるサードパーティサービスを使用しています。当アプリが使用するサードパーティサービスプロバイダーのプライバシーポリシーへのリンクは以下の通りです：</p>
          <ul>
            <li>Google Play 開発者サービス</li>
            <li>AdMob</li>
            <li>Google Analytics for Firebase</li>
          </ul>

          <h3>3. ログデータ</h3>
          <p>
            当社のサービスをご利用いただく際、アプリでエラーが発生した場合、ログデータと呼ばれる端末上のデータと情報（サードパーティ製品を通じて）を収集することをお知らせします。このログデータには、端末のインターネットプロトコル（「IP」）アドレス、端末名、オペレーティングシステムのバージョン、当社のサービスを利用する際のアプリの設定、サービスを利用した日時、およびその他の統計情報が含まれる場合があります。これらはエラーの修正および品質向上のためにのみ使用されます。
          </p>

          <h3>4. お問い合わせ</h3>
          <p>
            当社のプライバシーポリシーについてご質問やご提案がある場合は、お気軽に以下のメールアドレスまでご連絡ください：
            <a href="mailto:sar0977@gmail.com">sar0977@gmail.com</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
