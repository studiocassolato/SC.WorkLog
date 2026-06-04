namespace SC.WorkLog.Common.Settings
{
    public class CognitoSettings
    {
        public string Region { get; set; }
        public string UserPoolId { get; set; }
        public string ClientId { get; set; }
        public string Authority { get; set; }
        public string ValidIssuer { get; set; }
        public string ValidAudience { get; set; }
    }
}
